# NESA-AUTO-BOT
# Nesa Auto Bot 🤖

An automated bot for interacting with the Nesa AI platform, designed to perform various tasks including faucet claiming, token swapping, staking, and chatting with AI models.

## Features

- **Multi-account support** - Run multiple accounts simultaneously
- **Auto Faucet Claiming** - Claim both NES and USDN testnet faucets
- **Token Swapping** - Swap between USDN and project tokens on testnet
- **Staking** - Stake NES tokens in projects
- **AI Chat Automation** - Automatically chat with AI models to earn points

## Prerequisites

- Node.js (v18 or higher)
- NPM or Yarn
- Testnet accounts on Nesa AI platform

## Installation

1. Clone the repository:
```bash
git clone https://github.com/vikitoshi/Nesa-Auto-Bot.git
cd Nesa-Auto-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your account credentials:
```env
# Account 1
PRIVATE_KEY_1=your_private_key_here
EMAIL_1=your_email_here
PASSWORD_1=your_password_here

# Account 2 (optional)
PRIVATE_KEY_2=another_private_key
EMAIL_2=another_email
PASSWORD_2=another_password

# Add more accounts as needed (PRIVATE_KEY_3, EMAIL_3, etc.)

# Debug mode for swaps (optional)
DEBUG_SWAP=0
```

## Usage

1. Start the bot:
```bash
node index.js
```

2. Follow the interactive menu:
   - **Option 1**: Claim faucets (NES & USDN) for all accounts
   - **Option 2**: Perform token swaps
   - **Option 3**: Stake NES tokens
   - **Option 4**: Chat with AI models
   - **Option 0**: Exit the bot

## Configuration

### Environment Variables
- `PRIVATE_KEY_X`: EVM private key for account X
- `EMAIL_X`: Nesa AI account email for account X
- `PASSWORD_X`: Nesa AI account password for account X

## Important Notes

⚠️ **WARNING**: 
- This bot is for **TESTNET ONLY**
- Use only testnet accounts and tokens
- Never use mainnet private keys or real funds
- The bot is for educational purposes only

## Safety Features

- Input validation for all user inputs
- Error handling with descriptive messages
- Balance checks before transactions
- Rate limiting awareness
- Transaction simulation before execution

## Troubleshooting

Common issues and solutions:

1. **Login Failed**: Check your email/password in `.env` file
2. **Insufficient Balance**: Claim faucets first (Option 1)
3. **Transaction Errors**: Ensure you have enough gas/NES for fees
4. **Rate Limiting**: Wait and try again later

## Contributing

Feel free to submit issues and pull requests to improve the bot.

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The developers are not responsible for any loss of funds or account issues. This bot is intended for educational purposes and testing on testnet environments only.
