# Pharos Testnet Interaction Bot

Automated bot for interacting with the Pharos testnet blockchain.

- Register Here : [Pharos Testnet](https://testnet.pharosnetwork.xyz/experience?inviteCode=pcDSvtHJeoqTPMAU)  
- Connect Your Wallet  
- Connect X and Discord Account

## 🚀 Functions

The bot performs these interactions automatically:

- **🚰 Faucet Claims** - Claims testnet tokens when available (Make sure you have connected your X account)
- **✅ Daily Check-ins** - Performs daily check-ins for rewards
- **💸 PHRS Transfers** - Sends PHRS tokens between wallets
- **🔄 Token Wrapping** - Wraps PHRS to WPHRS (10 times)
- **🔓 Token Unwrapping** - Unwraps WPHRS back to PHRS (10 times)

## 📦 Installation

1. **Install Node.js** (version 16 or higher)

2. **Clone and setup:**
   ```bash
   git clone https://github.com/mirai-web3/Pharos-Testnet-Auto-Bot.git
   cd Pharos-Testnet-Auto-Bot
   npm install
   ```

3. **Create configuration files:**

   **privatekeys.txt** - Add your private keys (one per line):
   ```
   0x1234567890abcdef...
   0xabcdef1234567890...
   ```

   **wallets.txt** - Add target wallet addresses for transfers:
   ```
   0x742d35cc6bf8b4c8d...
   0x8ba1f109551bd432d...
   ```

   **proxies.txt** (optional) - Add proxy servers:
   ```
   http://username:password@proxy1:port
   http://proxy2:port
   ```

## ⚙️ Configuration

Edit these settings in the code if needed:

```javascript
const PARAMS = {
  WRAP_AMOUNT: '0.000005342',      // Amount per wrap
  TRANSFER_AMOUNT: '0.000001234',  // Amount per transfer
  UNWRAP_AMOUNT: '0.000004321',    // Amount per unwrap
  TRANSFER_COUNT: 10,              // Number of transfers
  WRAP_COUNT: 10,                  // Number of wraps
  UNWRAP_COUNT: 10,                // Number of unwraps
  RANDOMIZE: true,                 // Randomize amounts
  VARIATION: 0.1                   // Variation percentage (±10%)
};
```

## 🔄 Usage

**Start the bot:**
```bash
npm start
# or
node index.js
```

**Stop the bot:**
Press `Ctrl+C`

## 📊 Results Display

After each cycle, you'll see results like this:

```
====================================================
  INTERACTION RESULTS SUMMARY - by miraiweb3
====================================================

📋 WALLET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0x7A3b...F42d   🚰✅  ✅✅  💸10/10  🔄9/10   🔓10/10
0xE21a...9B0f   🚰❌  ✅✅  💸8/10   🔄10/10  🔓10/10

⏱  Waiting for next cycle in: 29m 37s
```

**Legend:**
- 🚰 = Faucet claim
- ✅ = Daily check-in
- 💸 = Transfers (successful/total)
- 🔄 = Wraps (successful/total)
- 🔓 = Unwraps (successful/total)

## 🔧 Troubleshooting

**"No private keys found"**
- Make sure `privatekeys.txt` exists with valid private keys

**Transactions failing**
- Check if wallets have sufficient PHRS balance
- Verify network connectivity

**Faucet not available**
- Faucet has cooldown periods, bot will retry next cycle

## ⚠️ Important Notes

- This is for **testnet only** - tokens have no real value
- Keep your private keys secure
- The bot runs continuously until stopped
- Default cycle interval is 30 minutes

## 📄 License

MIT License

## ⚠️ Disclaimer

This bot is for educational purposes only.

---

**Developed by:** [miraiweb3](https://github.com/mirai-web3)
