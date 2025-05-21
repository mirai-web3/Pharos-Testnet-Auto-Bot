# Pharos Testnet Automation Bot

An automated bot for performing routine operations on the Pharos Testnet, designed to interact with the network efficiently while maintaining a clear console interface.

## 🚀 Features

- **Faucet Claims**: Automatically claim from the testnet faucet when available
- **Daily Check-ins**: Perform daily check-ins to earn rewards
- **PHRS Transfers**: Execute multiple transfers between wallets
- **PHRS ↔ WPHRS Operations**: Wrap and unwrap tokens automatically
- **Multi-Wallet Support**: Run operations across any number of wallets sequentially
- **Proxy Support**: Route operations through HTTPS proxies for improved reliability
- **Clear Console Interface**: Easy-to-follow operation progress with color coding

## 📋 Requirements

- Node.js (v16+)
- NPM or Yarn
- Your private key wallet(s)
- Proxy list (Optional)

## 📦 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/mirai-web3/Pharos-Testnet-Auto-Bot.git
   cd Pharos-Testnet-Auto-Bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## ⚙️ Configuration

### File Setup

Before running the bot, you'll need to create these files:

1. **privatekeys.txt**: Add one private key per line (must start with `0x`)
   ```
   0x123...abc
   0x456...def
   ```

2. **wallets.txt**: Add wallet addresses for transfers
   ```
   0xabc...123
   0xdef...456
   ```

3. **proxies.txt** (Optional): Add proxies in standard format
   ```
   http://user:pass@ip:port
   http://ip:port
   ```

## 🔄 Usage

Run the bot:

```bash
node index.js
```

The bot will:
1. Load your configuration and display a summary
2. Process each wallet sequentially through the operation sequence
3. Wait for the configured cycle interval
4. Repeat the process until stopped

Stop the bot by pressing `CTRL+C`.

## 📂 File Structure

```
pharos-testnet-bot/
├── index.js              # Main bot code
├── package.json          # Dependencies
├── privatekeys.txt       # Private keys (required)
├── wallets.txt           # Target wallets for transfers (required)
├── proxies.txt           # Proxy list (optional)
└── README.md             # This file
```

## 🛠️ Troubleshooting

### Common Issues

- **"No private keys found"**: Ensure your `privatekeys.txt` file exists and contains valid keys
- **Transaction failures**: Verify you have sufficient PHRS for operations
- **API errors**: Check network connectivity and proxy settings

### Proxy Management

The bot includes intelligent proxy management that:
- Tracks success rates for each proxy
- Automatically favors more reliable proxies
- Temporarily disables failing proxies
- Rotates proxies to prevent overuse

## 📢 Disclaimer

This bot is for educational purposes and intended for use on testnet only. Use responsibly and in accordance with network terms of service.

## 📄 License

MIT License

## 🙏 Acknowledgements

- Developed by [miraiweb3](https://github.com/mirai-web3)
- Uses ethers.js for blockchain interactions
- Special thanks to the Pharos Network team

---

If you find this tool useful, consider contributing to its development or leaving a star ⭐ on GitHub.
