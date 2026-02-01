const axios = require("axios");
const { ethers } = require("ethers");
const { DirectSecp256k1Wallet } = require("@cosmjs/proto-signing");
const { SigningStargateClient } = require("@cosmjs/stargate");
const { Registry } = require("@cosmjs/proto-signing");
const { defaultRegistryTypes } = require("@cosmjs/stargate");
const { MsgExecuteContract } = require("cosmjs-types/cosmwasm/wasm/v1/tx");
const readline = require("readline");
require("dotenv").config();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

const logger = {
  info: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[→] ${msg}${colors.reset}`),
  banner: () => {
    console.clear();
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`------------------------------------`);
    console.log(` Nesa Auto Bot - Airdrop Insiders`);
    console.log(`-------------------------------------${colors.reset}`);
  },
};

const RANDOM_QUESTIONS = [
  "What is the future of AI?",
  "Explain quantum computing",
  "How to bake a cake?",
  "What is Nesa AI?",
  "Write a poem about coding",
  "Best crypto investment strategies?",
  "Explain relativity theory",
  "History of the internet",
  "How do neural networks learn?",
  "Top travel destinations 2025",
];

const API_BASE = "https://api-test.nesa.ai";
const RPC_COSMOS = "https://rpc.dev.nesa.ai";
const RPC_EVM = "https://rpc-evm.test.nesa.ai";

const STAKE_CONTRACT =
  "nesa1durey747cm82sfqm0ph93wk63ljnm4j60euyp2y3krj8dnfqzacqf9xfck";

const SWAP_ROUTER_ADDRESS = "0xC716CEA6905E0d899453d63aA54892Ef71537074";
const USDN_ADDRESS = "0xCd18Bde1F3C201f3E82e34b4FBE8933b6AA3C219";

const DEBUG_SWAP = String(process.env.DEBUG_SWAP || "").trim() === "1";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
];

function strip0x(hex) {
  if (!hex) return hex;
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function errMsg(e) {
  return (
    e?.shortMessage ||
    e?.reason ||
    e?.info?.error?.message ||
    e?.error?.message ||
    e?.message ||
    String(e)
  );
}

class NesaBot {
  constructor(privateKey, index) {
    this.privateKey = privateKey;
    this.index = index;

    this.token = null;
    this.cosmosAddress = null;
    this.evmAddress = null;
    this.registry = null;

    this.provider = new ethers.JsonRpcProvider(RPC_EVM);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.evmAddress = this.wallet.address;

    this.routerContract = new ethers.Contract(SWAP_ROUTER_ADDRESS, ROUTER_ABI, this.wallet);
  }

  getHeaders(withAuth = true) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json;charset=UTF-8",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      origin: "https://beta.nesa.ai",
      referer: "https://beta.nesa.ai/",
    };
    if (withAuth && this.token) headers.authorization = `Bearer ${this.token}`;
    return headers;
  }

  async getCosmosWallet() {
    const pk = strip0x(this.privateKey);
    const privateKeyBuffer = Buffer.from(pk, "hex");
    const wallet = await DirectSecp256k1Wallet.fromKey(privateKeyBuffer, "nesa");
    const [account] = await wallet.getAccounts();

    this.cosmosAddress = account.address;

    this.registry = new Registry([...defaultRegistryTypes]);
    this.registry.register("/cosmwasm.wasm.v1.MsgExecuteContract", MsgExecuteContract);

    return { wallet, address: account.address };
  }

  async login(email, password) {
    try {
      const response = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password, remember: true },
        { headers: this.getHeaders(false) }
      );
      this.token = response.data.access_token;
      return response.data;
    } catch (error) {
      logger.error(`Account ${this.index}: Login failed - ${errMsg(error)}`);
      throw error;
    }
  }

  async displayUserInfo() {
    try {
      const response = await axios.get(`${API_BASE}/auth/me/`, { headers: this.getHeaders() });
      const user = response.data.user;

      const ethBalWei = await this.provider.getBalance(this.evmAddress);
      const ethBal = ethers.formatEther(ethBalWei);

      const usdnContract = new ethers.Contract(USDN_ADDRESS, ERC20_ABI, this.wallet);
      let usdnBal = "0.0";
      try {
        const usdnDecimals = await usdnContract.decimals();
        const usdnBalWei = await usdnContract.balanceOf(this.evmAddress);
        usdnBal = ethers.formatUnits(usdnBalWei, usdnDecimals);
      } catch {
        usdnBal = "Error";
      }

      console.log(`${colors.white}=== Account ${this.index} Information ===`);
      console.log(`${colors.yellow}Email ${colors.reset}       : ${user.email}`);
      console.log(`${colors.yellow}Credits ${colors.reset}     : ${user.credits}`);
      console.log(`${colors.yellow}Points ${colors.reset}      : ${user.points}`);
      console.log(`${colors.yellow}EVM Wallet ${colors.reset}  : ${this.evmAddress}`);
      console.log(`${colors.yellow}Native ETH ${colors.reset}  : ${parseFloat(ethBal).toFixed(5)} ETH`);
      console.log(`${colors.yellow}USDN Bal ${colors.reset}    : ${usdnBal} USDN`);
      console.log(`==================================`);
    } catch (error) {
      logger.error(`Account ${this.index}: Failed to fetch info - ${errMsg(error)}`);
    }
  }

  async getProjects() {
    try {
      const response = await axios.get(`${API_BASE}/dai/list?includeDev=false&limit=50&skip=0`, {
        headers: this.getHeaders(),
      });
      return response.data.list.filter((p) => p.tokenType === "create" && p.token?.creation?.address);
    } catch {
      return [];
    }
  }

  async getModels() {
    try {
      const response = await axios.get(`${API_BASE}/models?includeAvgScore=true&limit=36`, {
        headers: this.getHeaders(),
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  }

  async claimNESFaucet() {
    try {
      if (!this.cosmosAddress) await this.getCosmosWallet();
      logger.loading(`Account ${this.index}: Claiming NES Faucet...`);
      await axios.post(
        `${API_BASE}/faucet`,
        { walletAddress: this.cosmosAddress },
        { headers: this.getHeaders() }
      );
      logger.success(`Account ${this.index}: NES Faucet Claimed`);
    } catch (e) {
      if (e.response?.status === 429) logger.warn(`Account ${this.index}: NES Faucet Rate Limited`);
      else logger.error(`Account ${this.index}: NES Faucet Failed - ${errMsg(e)}`);
    }
  }

  async claimUSDNFaucet() {
    try {
      logger.loading(`Account ${this.index}: Claiming USDN Faucet...`);

      try {
        await axios.post(`${API_BASE}/dai/tele/${this.evmAddress}`, {}, { headers: this.getHeaders() });
      } catch {}

      await axios.post(`${API_BASE}/evm-faucet/${this.evmAddress}/claim`, {}, { headers: this.getHeaders() });
      logger.success(`Account ${this.index}: USDN Faucet Claimed`);
    } catch (e) {
      if (e.response?.status === 429) logger.warn(`Account ${this.index}: USDN Faucet Rate Limited`);
      else logger.error(`Account ${this.index}: USDN Faucet Failed (Status: ${e.response?.status}) - ${errMsg(e)}`);
    }
  }

  async executeSwap(targetProject, direction, amountInput, txCount) {
    const projectTokenAddress = targetProject.token.creation.address;

    const tokenInAddress = direction === 1 ? USDN_ADDRESS : projectTokenAddress;
    const tokenOutAddress = direction === 1 ? projectTokenAddress : USDN_ADDRESS;

    const tokenInContract = new ethers.Contract(tokenInAddress, ERC20_ABI, this.wallet);

    let decimals = 18;
    try {
      decimals = await tokenInContract.decimals();
    } catch {
      decimals = tokenInAddress.toLowerCase() === USDN_ADDRESS.toLowerCase() ? 6 : 18;
    }

    let tokenSymbol = direction === 1 ? "USDN" : targetProject.token.ticker;
    try {
      tokenSymbol = await tokenInContract.symbol();
    } catch {}

    const amountWei = ethers.parseUnits(String(amountInput), decimals);

    logger.info(
      `Account ${this.index}: Preparing Swap ${amountInput} ${tokenSymbol} (${tokenInAddress}) -> (${tokenOutAddress})`
    );

    for (let i = 0; i < txCount; i++) {
      try {
        const balance = await tokenInContract.balanceOf(this.evmAddress);
        if (balance < amountWei) {
          logger.error(
            `Account ${this.index}: Insufficient Balance! Has ${ethers.formatUnits(balance, decimals)} ${tokenSymbol}, Need ${amountInput}`
          );
          return;
        }

        const allowance = await tokenInContract.allowance(this.evmAddress, SWAP_ROUTER_ADDRESS);
        if (allowance < amountWei) {
          logger.loading(`Account ${this.index}: Approving ${tokenSymbol}...`);
          const approveTx = await tokenInContract.approve(SWAP_ROUTER_ADDRESS, ethers.MaxUint256);
          await approveTx.wait();
          logger.success(`Account ${this.index}: Approved`);
        }

        const baseParams = {
          tokenIn: tokenInAddress,
          tokenOut: tokenOutAddress,
          fee: 3000,
          recipient: this.evmAddress,
          amountIn: amountWei,
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        };

        const feeTiers = [500, 3000, 10000];
        let chosenFee = null;

        for (const f of feeTiers) {
          const p = { ...baseParams, fee: f };
          try {
            await this.routerContract.exactInputSingle.estimateGas(p);
            chosenFee = f;
            break;
          } catch {}
        }

        if (!chosenFee) {
          try {
            await this.routerContract.exactInputSingle.staticCall(baseParams);
          } catch (e) {
            logger.error(`Account ${this.index}: Swap precheck reverted - ${errMsg(e)}`);
          }
          logger.error(
            `Account ${this.index}: No pool/liquidity for fee tiers ${feeTiers.join(", ")} (estimateGas always reverts)`
          );
          return;
        }

        const params = { ...baseParams, fee: chosenFee };

        const txReq = await this.routerContract.exactInputSingle.populateTransaction(params);

        if (!txReq.data || txReq.data === "0x") {
          logger.error(
            `Account ${this.index}: FATAL - calldata empty. (This would send empty tx and revert). Check ABI/address.`
          );
          return;
        }

        if (DEBUG_SWAP) {
          console.log(`${colors.yellow}--- DEBUG SWAP TX (Account ${this.index}) ---${colors.reset}`);
          console.log("TO   :", txReq.to);
          console.log("DATA :", txReq.data.slice(0, 10), "... (len:", txReq.data.length, ")");
          console.log("FULL :", txReq.data);
          console.log("VALUE:", txReq.value?.toString?.() ?? txReq.value ?? "0");
          console.log("FEE  :", chosenFee);
          console.log("PARAM:", {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            fee: params.fee,
            recipient: params.recipient,
            amountIn: params.amountIn.toString(),
            amountOutMinimum: params.amountOutMinimum.toString(),
            sqrtPriceLimitX96: params.sqrtPriceLimitX96.toString(),
          });
          console.log(`${colors.yellow}----------------------------------------${colors.reset}`);
        }

        try {
          await this.routerContract.exactInputSingle.staticCall(params);
        } catch (e) {
          logger.error(`Account ${this.index}: Swap would revert (staticCall) - ${errMsg(e)}`);
          return;
        }

        logger.loading(`Account ${this.index}: Swapping (${i + 1}/${txCount})`);

        const tx = await this.routerContract.exactInputSingle(params, { gasLimit: 500000 });
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          logger.success(`Account ${this.index}: Swap Success! Hash: ${tx.hash}`);

          try {
            await axios.post(
              `${API_BASE}/evm-tx/${tx.hash}`,
              { from: tokenInAddress, to: tokenOutAddress },
              { headers: this.getHeaders() }
            );
          } catch {}
        } else {
          logger.error(`Account ${this.index}: Swap Reverted (receipt.status=0)`);
        }

        await this.sleep(2000);
      } catch (error) {
        logger.error(`Account ${this.index}: Swap Error - ${errMsg(error)}`);
      }
    }
  }

  async executeStake(targetProject, amountInput) {
    if (!this.cosmosAddress) await this.getCosmosWallet();
    const { wallet } = await this.getCosmosWallet();
    const client = await SigningStargateClient.connectWithSigner(RPC_COSMOS, wallet, {
      registry: this.registry,
    });

    const amountUnes = (parseFloat(amountInput) * 1_000_000).toString();

    const stakeMsg = {
      stake: {
        amount: amountUnes,
        company_id: targetProject._id,
        lockup_period: "days90",
      },
    };

    const msgExecuteContract = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: {
        sender: this.cosmosAddress,
        contract: STAKE_CONTRACT,
        msg: new TextEncoder().encode(JSON.stringify(stakeMsg)),
        funds: [{ denom: "unes", amount: amountUnes }],
      },
    };

    try {
      logger.loading(`Account ${this.index}: Staking ${amountInput} NES...`);
      const fee = { amount: [{ denom: "unes", amount: "30000" }], gas: "300000" };
      const result = await client.signAndBroadcast(this.cosmosAddress, [msgExecuteContract], fee, "");

      if (result.code === 0) {
        logger.success(`Account ${this.index}: Stake Success!`);
        await this.sleep(2000);

        await axios.post(
          `${API_BASE}/dai/${targetProject._id}/stake`,
          {
            account: this.cosmosAddress,
            amount: amountUnes,
            company_id: targetProject._id,
            lockup_seconds: 7776000,
            tx_hash: result.transactionHash,
          },
          { headers: this.getHeaders() }
        );
      } else {
        logger.error(`Account ${this.index}: Stake Failed (Code ${result.code})`);
      }
    } catch (error) {
      logger.error(`Account ${this.index}: Stake Error - ${errMsg(error)}`);
    }
  }

  async executeChat(model, chatCount) {
    logger.info(`Account ${this.index}: Chatting with ${model.name}`);
    for (let i = 0; i < chatCount; i++) {
      try {
        const query = RANDOM_QUESTIONS[Math.floor(Math.random() * RANDOM_QUESTIONS.length)];
        logger.loading(`Account ${this.index}: Chat (${i + 1}/${chatCount})...`);

        await axios.post(`${API_BASE}/models/${model._id}/use`, {}, { headers: this.getHeaders() });

        const historyData = {
          api: true,
          executionTime: 1500,
          loraIds: [],
          minerRates: [],
          modelId: model._id,
          pricePerToken: "",
          private: false,
          question: JSON.stringify([{ content: [{ text: query, type: "text" }], role: "user" }]),
          result: "Simulation",
          sessionId: "",
          status: "completed",
          transactionHash: "",
          walletAddress: "",
        };

        await axios.post(`${API_BASE}/query-history`, historyData, { headers: this.getHeaders() });
        logger.success(`Account ${this.index}: Chat Done`);
        await this.sleep(3000);
      } catch (error) {
        logger.error(`Account ${this.index}: Chat Error - ${errMsg(error)}`);
      }
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function main() {
  logger.banner();

  const accounts = [];
  let idx = 1;
  while (process.env[`PRIVATE_KEY_${idx}`]) {
    accounts.push({
      privateKey: process.env[`PRIVATE_KEY_${idx}`],
      email: process.env[`EMAIL_${idx}`],
      password: process.env[`PASSWORD_${idx}`],
      index: idx,
    });
    idx++;
  }

  if (accounts.length === 0) {
    logger.error("No accounts found in .env");
    rl.close();
    return;
  }

  console.log(`${colors.yellow}Detected ${accounts.length} accounts.${colors.reset}\n`);

  const bots = [];
  for (const acc of accounts) {
    const bot = new NesaBot(acc.privateKey, acc.index);
    try {
      await bot.login(acc.email, acc.password);
      await bot.displayUserInfo();
      bots.push(bot);
    } catch {
      logger.error(`Account ${acc.index} Login Failed`);
    }
  }

  if (bots.length === 0) {
    rl.close();
    return;
  }

  const masterBot = bots[0];

  while (true) {
    console.log(`\n${colors.cyan}--- MENU OPTIONS ---${colors.reset}`);
    console.log(`1. Claim Faucet`);
    console.log(`2. Swap`);
    console.log(`3. Stake`);
    console.log(`4. Chat`);
    console.log(`0. Exit`);

    const choice = await ask(`${colors.white}Select option: ${colors.reset}`);

    if (choice === "0") {
      rl.close();
      process.exit(0);
    } else if (choice === "1") {
      for (const bot of bots) {
        await bot.claimNESFaucet();
        await bot.claimUSDNFaucet();
      }
    } else if (choice === "2") {
      const projects = await masterBot.getProjects();
      if (projects.length === 0) {
        logger.warn("No projects found.");
        continue;
      }

      console.log(`\n${colors.yellow}Top 10 Projects:${colors.reset}`);
      projects
        .slice(0, 10)
        .forEach((p, i) => console.log(`${i + 1}. ${p.projectName} (${p.token.ticker})`));

      const pIdx = parseInt(await ask(`${colors.white}Select Project (1-10): ${colors.reset}`), 10) - 1;
      if (isNaN(pIdx) || pIdx < 0 || pIdx >= Math.min(projects.length, 10)) continue;
      const targetProject = projects[pIdx];

      console.log(`1. USDN -> ${targetProject.token.ticker}`);
      console.log(`2. ${targetProject.token.ticker} -> USDN`);
      const dir = parseInt(await ask(`${colors.white}Choose Option (1/2): ${colors.reset}`), 10);
      const amount = parseFloat(await ask(`${colors.white}Amount: ${colors.reset}`));
      const count = parseInt(await ask(`${colors.white}Tx Count: ${colors.reset}`), 10);

      if (![1, 2].includes(dir) || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(count) || count <= 0) {
        logger.warn("Invalid input.");
        continue;
      }

      for (const bot of bots) await bot.executeSwap(targetProject, dir, amount, count);
    } else if (choice === "3") {
      const projects = await masterBot.getProjects();
      if (projects.length === 0) {
        logger.warn("No projects found.");
        continue;
      }

      console.log(`\n${colors.yellow}Top 10 Projects:${colors.reset}`);
      projects.slice(0, 10).forEach((p, i) => console.log(`${i + 1}. ${p.projectName}`));

      const pIdx = parseInt(await ask(`${colors.white}Select Project (1-10): ${colors.reset}`), 10) - 1;
      if (isNaN(pIdx) || pIdx < 0 || pIdx >= Math.min(projects.length, 10)) continue;
      const targetProject = projects[pIdx];

      const amount = parseFloat(await ask(`${colors.white}Amount NES: ${colors.reset}`));
      if (!Number.isFinite(amount) || amount <= 0) {
        logger.warn("Invalid amount.");
        continue;
      }

      for (const bot of bots) await bot.executeStake(targetProject, amount);
    } else if (choice === "4") {
      const models = await masterBot.getModels();
      if (models.length === 0) {
        logger.warn("No models found.");
        continue;
      }

      console.log(`\n${colors.yellow}Top 10 Models:${colors.reset}`);
      models.slice(0, 10).forEach((m, i) => console.log(`${i + 1}. ${m.name}`));

      const mIdx = parseInt(await ask(`${colors.white}Select Model: ${colors.reset}`), 10) - 1;
      if (isNaN(mIdx) || mIdx < 0 || mIdx >= Math.min(models.length, 10)) continue;
      const targetModel = models[mIdx];

      const count = parseInt(await ask(`${colors.white}Chat Count: ${colors.reset}`), 10);
      if (!Number.isFinite(count) || count <= 0) {
        logger.warn("Invalid chat count.");
        continue;
      }

      for (const bot of bots) await bot.executeChat(targetModel, count);
    }
  }
}

main().catch((e) => {
  logger.error(`Fatal error: ${errMsg(e)}`);
  rl.close();
  process.exit(1);
});
