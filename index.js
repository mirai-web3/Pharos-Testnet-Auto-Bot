/**
 * Pharos Testnet Automation Bot
 * Developed by: miraiweb3 (https://github.com/mirai-web3)
 * 
 * Automates various interactions on the Pharos testnet:
 * - Faucet claims
 * - Daily check-ins
 * - PHRS transfers
 * - PHRS ↔ WPHRS wrapping/unwrapping
 */

// @ts-nocheck
const { ethers } = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const randomUseragent = require('random-useragent');
const axios = require('axios');
const path = require('path');

// ======= TERMINAL COLORS =======
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m'
};

// ======= CONFIGURATION =======
const CONFIG = {
  network: {
    name: 'Pharos Testnet',
    chainId: 688688,
    rpcUrl: 'https://testnet.dplabs-internal.com'
  },
  contract: {
    PHRS: '0xf6a07fe10e28a70d1b0f36c7eb7745d2bae2a312',
    WPHRS: '0x76aaada469d23216be5f7c596fa25f282ff9b364'
  },
  api: {
    baseUrl: 'https://api.pharosnetwork.xyz',
    inviteCode: 'pcDSvtHJeoqTPMAU'
  },
  timing: {
    betweenOps: [2000, 5000],      // Min/max ms between operations
    betweenWallets: [5000, 15000], // Min/max ms between wallets
    cycleInterval: 30              // Minutes between cycles
  },
  display: {
    clearBetweenSteps: true,       // Clear terminal between major steps
    showStepSummary: true,         // Show summary of previous steps when clearing
    compactMode: false             // More compact display (fewer blank lines)
  }
};

// ======= OPERATION PARAMETERS =======
const PARAMS = {
  // Transaction amounts
  WRAP_AMOUNT: '0.000005342',
  TRANSFER_AMOUNT: '0.000001234',
  
  // Operation counts
  TRANSFER_COUNT: 10,
  WRAP_COUNT: 10,
  
  // Randomization
  RANDOMIZE: true,
  VARIATION: 0.1
};

/**
 * Logger class for handling console output and formatting
 */
class Logger {
  constructor(options = {}) {
    this.logToFile = false; // Disabled by default to save disk space
    this.logDir = options.logDir || './logs';
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.stepResults = {};
    this.currentWallet = "";
    this.currentWalletIndex = 0;
    this.totalWallets = 0;
  }
  
  writeToFile(message) {
    // Disabled to save disk space
    return;
  }
  
  recordActivity(walletAddress, type, txHash, status, details = {}) {
    // Disabled to save disk space
    return;
  }
  
  /**
   * Clears the terminal screen and shows relevant context
   */
  clearScreen() {
    if (CONFIG.display.clearBetweenSteps) {
      process.stdout.write('\x1Bc');
      console.clear();
      
      // Show banner again
      this.showBanner();
      
      // Show step summary if enabled
      if (CONFIG.display.showStepSummary && this.currentWallet) {
        this.showStepSummary();
      }
    }
  }
  
  /**
   * Displays the bot banner
   */
  showBanner() {
    const banner = `
${colors.cyan}${colors.bright}====================================================
  PHAROS TESTNET AUTOMATION BOT - by miraiweb3
  Faucet → Check-in → Transfer → Wrap → Unwrap
====================================================${colors.reset}
`;
    console.log(banner);
  }
  
  /**
   * Shows a summary of completed steps
   */
  showStepSummary() {
    const timestamp = new Date().toLocaleTimeString();
    const progress = `${this.currentWalletIndex + 1}/${this.totalWallets}`;
    const shortenedAddress = this.currentWallet ? 
      `${this.currentWallet.slice(0, 6)}...${this.currentWallet.slice(-4)}` : "";
    
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.bgBlue}${colors.bright} WALLET ${progress} ${colors.reset} ${colors.blue}${shortenedAddress}${colors.reset}\n`);
    
    // Show status of completed steps
    const steps = Object.keys(this.stepResults);
    if (steps.length > 0) {
      console.log(`${colors.cyan}Steps completed:${colors.reset}`);
      steps.forEach(step => {
        const result = this.stepResults[step];
        const statusColor = result.success ? colors.green : colors.yellow;
        console.log(`  ${statusColor}${step}:${colors.reset} ${result.message}`);
      });
      console.log("");
    }
  }
  
  /**
   * Records the result of a completed step
   */
  recordStepResult(step, success, message) {
    this.stepResults[step] = { success, message };
  }
  
  /**
   * Sets the current wallet being processed
   */
  setCurrentWallet(address, index, total) {
    this.currentWallet = address;
    this.currentWalletIndex = index;
    this.totalWallets = total;
    this.stepResults = {}; // Reset step results for new wallet
  }
  
  /**
   * General logging method with formatting
   */
  log(type, message, consoleOnly = false) {
    let formatted;
    const timestamp = new Date().toLocaleTimeString();
    
    // Only add timestamp for transaction-related logs
    const useTimestamp = (type === 'tx');
    
    switch (type) {
      case 'info':
        formatted = `${colors.green}[INFO]${colors.reset} ${message}`;
        break;
      case 'success':
        formatted = `${colors.green}[SUCCESS]${colors.reset} ${message}`;
        break;
      case 'error':
        formatted = `${colors.red}[ERROR]${colors.reset} ${message}`;
        break;
      case 'warn':
        formatted = `${colors.yellow}[WARN]${colors.reset} ${message}`;
        break;
      case 'tx':
        formatted = `${colors.magenta}[${timestamp}]${colors.reset} ${message}`;
        break;
      case 'step':
        formatted = `${colors.cyan}[STEP]${colors.reset} ${message}`;
        break;
      default:
        formatted = `${message}`;
    }
    
    console.log(formatted);
    // No file logging
  }
  
  // Shorthand logging methods
  info(message) { this.log('info', message); }
  success(message) { this.log('success', message); }
  error(message) { this.log('error', message); }
  warn(message) { this.log('warn', message); }
  tx(message) { this.log('tx', message); }
  step(message) { this.log('step', message); }
  
  // API logging methods (disabled)
  apiRequest(method, endpoint) {
    // Log disabled - console only when needed
  }
  
  apiResponse(status) {
    // Log disabled - console only when needed
  }
  
  /**
   * Displays the banner and clears the screen
   */
  banner() {
    // Clear the terminal first
    process.stdout.write('\x1Bc');
    console.clear();
    
    this.showBanner();
    // No file logging
  }
  
  /**
   * Displays an operation header
   */
  operation(walletIndex, walletCount, address, operationName) {
    // Set current wallet info
    this.setCurrentWallet(address, walletIndex, walletCount);
    
    // Clear the screen before showing the operation header
    if (CONFIG.display.clearBetweenSteps) {
      this.clearScreen();
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const progress = `${walletIndex + 1}/${walletCount}`;
    const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    
    console.log(`${colors.cyan}[${timestamp}]${colors.reset} ${colors.bgBlue}${colors.bright} WALLET ${progress} ${colors.reset} ${colors.blue}${shortenedAddress}${colors.reset} ${colors.bgMagenta}${colors.bright} ${operationName} ${colors.reset}`);
  }
  
  /**
   * Displays a countdown timer
   */
  countdown(seconds) {
    process.stdout.write(`\r${colors.yellow}⏱  Waiting for next cycle in: ${Math.floor(seconds/60)}m ${seconds%60}s ${colors.reset}`);
  }
}

/**
 * FileManager static class for loading configuration files
 */
class FileManager {
  /**
   * Loads lines from a file, trimming whitespace
   * @param {string} filename - The file to load
   * @returns {string[]} Array of non-empty lines
   */
  static loadLines(filename) {
    try {
      if (!fs.existsSync(filename)) {
        return [];
      }
      
      return fs.readFileSync(filename, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);
    } catch (error) {
      console.error(`Failed to load ${filename}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Loads private keys from privatekeys.txt
   * @returns {string[]} Array of private keys
   */
  static loadPrivateKeys() {
    // Load private keys from privatekeys.txt file only
    return this.loadLines('privatekeys.txt')
      .filter(line => line.startsWith('0x'));
  }
  
  /**
   * Loads proxy configurations from proxies.txt
   * @returns {string[]} Array of proxy strings
   */
  static loadProxies() {
    return this.loadLines('proxies.txt');
  }
  
  /**
   * Loads wallet addresses from wallets.txt
   * @returns {string[]} Array of wallet addresses
   */
  static loadWalletAddresses() {
    return this.loadLines('wallets.txt')
      .filter(addr => ethers.isAddress(addr));
  }
}

/**
 * ProxyManager class for intelligent proxy rotation and tracking
 */
class ProxyManager {
  /**
   * Creates a new proxy manager instance
   * @param {string[]} proxies - List of proxy URLs
   */
  constructor(proxies = []) {
    this.proxies = proxies;
    this.currentIndex = 0;
    this.failedProxies = new Set();
    this.successRates = new Map();
    
    // Initialize success rates
    for (const proxy of proxies) {
      this.successRates.set(proxy, 0.5); // Start with neutral rating
    }
  }
  
  /**
   * Gets the next best proxy to use
   * @returns {string|null} Proxy URL or null if none available
   */
  getNext() {
    if (this.proxies.length === 0) return null;
    
    // If most proxies have failed, reset failure status
    if (this.failedProxies.size >= this.proxies.length * 0.8) {
      this.failedProxies.clear();
    }
    
    // Find best available proxy based on success rate
    const availableProxies = this.proxies.filter(p => !this.failedProxies.has(p));
    if (availableProxies.length === 0) return null;
    
    // Sort by success rate (highest first)
    availableProxies.sort((a, b) => {
      return (this.successRates.get(b) || 0) - (this.successRates.get(a) || 0);
    });
    
    // Return best performing proxy with some randomization to prevent overuse
    const randomIndex = Math.floor(Math.random() * Math.min(3, availableProxies.length));
    return availableProxies[randomIndex];
  }
  
  /**
   * Records a successful operation with a proxy
   * @param {string} proxy - The proxy that was successful
   */
  recordSuccess(proxy) {
    if (!proxy) return;
    
    const currentRate = this.successRates.get(proxy) || 0.5;
    const newRate = currentRate * 0.8 + 0.2; // Weighted update, max 1.0
    this.successRates.set(proxy, Math.min(1.0, newRate));
  }
  
  /**
   * Records a failed operation with a proxy
   * @param {string} proxy - The proxy that failed
   */
  recordFailure(proxy) {
    if (!proxy) return;
    
    const currentRate = this.successRates.get(proxy) || 0.5;
    const newRate = currentRate * 0.8; // Weighted update, decrease by 20%
    this.successRates.set(proxy, newRate);
    
    // Mark as failed if success rate drops too low
    if (newRate < 0.2) {
      this.failedProxies.add(proxy);
    }
  }
  
  /**
   * Gets statistics about proxy availability
   * @returns {Object} Proxy statistics
   */
  getStats() {
    return {
      total: this.proxies.length,
      available: this.proxies.length - this.failedProxies.size,
      failed: this.failedProxies.size
    };
  }
}

/**
 * API client for interacting with the Pharos API
 */
class PharosAPI {
  constructor(wallet, logger, proxy = null) {
    this.wallet = wallet;
    this.logger = logger;
    this.proxy = proxy;
    this.baseURL = CONFIG.api.baseUrl;
    this.inviteCode = CONFIG.api.inviteCode;
    this.jwt = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }
  
  async makeRequest(method, endpoint, data = null, additionalHeaders = {}) {
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.8',
      'sec-ch-ua': '"Chromium";v="136", "Not.A/Brand";v="99", "Google Chrome";v="136"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'Referer': 'https://testnet.pharosnetwork.xyz/',
      'Origin': 'https://testnet.pharosnetwork.xyz',
      'User-Agent': randomUseragent.getRandom(),
      ...additionalHeaders
    };
    
    if (this.jwt) {
      headers.authorization = `Bearer ${this.jwt}`;
    }
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers,
      timeout: 30000 // 30 second timeout
    };
    
    if (this.proxy) {
      config.httpsAgent = new HttpsProxyAgent(this.proxy);
    }
    
    if (data) {
      config.data = data;
    }
    
    try {
      // Log to file only, don't show in console
      this.logger.apiRequest(method, endpoint);
      const response = await axios(config);
      
      // Log to file only, don't show in console
      this.logger.apiResponse(response.status);
      
      return response;
    } catch (error) {
      // Enhanced error handling with retry
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.logger.warn(`Request failed, retrying (${this.retryCount}/${this.maxRetries}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
        return this.makeRequest(method, endpoint, data, additionalHeaders);
      }
      
      if (error.response) {
        throw new Error(`API error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error(`No response from API: ${error.message}`);
      } else {
        throw new Error(`API request failed: ${error.message}`);
      }
    }
  }
  
  async login() {
    try {
      this.logger.step(`Signing in with wallet: ${this.wallet.address.slice(0, 6)}...${this.wallet.address.slice(-4)}`);
      
      const message = "pharos";
      const signature = await this.wallet.signMessage(message);
      
      const url = `/user/login?address=${this.wallet.address}&signature=${signature}&invite_code=${this.inviteCode}`;
      const response = await this.makeRequest('POST', url);
      
      if (response.data.code !== 0 || !response.data.data.jwt) {
        throw new Error(response.data.msg || 'Login failed');
      }
      
      this.jwt = response.data.data.jwt;
      this.logger.success(`Login successful`);
      return true;
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      return false;
    }
  }
  
  async claimFaucet() {
    try {
      if (!this.jwt && !(await this.login())) {
        return false;
      }
      
      this.logger.step(`Checking faucet eligibility`);
      
      // Check faucet status first
      const statusResponse = await this.makeRequest(
        'GET',
        `/faucet/status?address=${this.wallet.address}`
      );
      
      if (statusResponse.data.code !== 0 || !statusResponse.data.data) {
        this.logger.error(`Faucet status check failed: ${statusResponse.data.msg || 'Unknown error'}`);
        return false;
      }
      
      if (!statusResponse.data.data.is_able_to_faucet) {
        const nextAvailable = new Date(statusResponse.data.data.avaliable_timestamp * 1000);
        const formattedTime = nextAvailable.toLocaleString();
        this.logger.warn(`Faucet not available until ${formattedTime}`);
        return false;
      }
      
      // Claim faucet
      this.logger.step(`Eligible for faucet claim, submitting request...`);
      const claimResponse = await this.makeRequest(
        'POST',
        `/faucet/daily?address=${this.wallet.address}`
      );
      
      if (claimResponse.data.code === 0) {
        this.logger.success(`Faucet claimed successfully!`);
        return true;
      } else {
        this.logger.error(`Faucet claim failed: ${claimResponse.data.msg || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Faucet claim error: ${error.message}`);
      return false;
    }
  }
  
  async dailyCheckIn() {
    try {
      if (!this.jwt && !(await this.login())) {
        return false;
      }
      
      this.logger.step(`Performing daily check-in`);
      
      const response = await this.makeRequest(
        'POST',
        `/sign/in?address=${this.wallet.address}`
      );
      
      if (response.data.code === 0) {
        this.logger.success(`Daily check-in successful!`);
        return true;
      } else {
        // Check if already checked in today
        const isAlreadyCheckedIn = response.data.msg?.includes('already');
        
        if (isAlreadyCheckedIn) {
          this.logger.info(`Already checked in today`);
          return true; // Count as success
        } else {
          this.logger.error(`Check-in failed: ${response.data.msg || 'Unknown error'}`);
          return false;
        }
      }
    } catch (error) {
      this.logger.error(`Check-in error: ${error.message}`);
      return false;
    }
  }
}

/**
 * Handles blockchain transactions
 */
class TransactionHandler {
  constructor(wallet, logger) {
    this.wallet = wallet;
    this.logger = logger;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    // Initialize WPHRS contract
    this.wphrsContract = new ethers.Contract(
      CONFIG.contract.WPHRS,
      [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address, address) view returns (uint256)',
        'function approve(address, uint256) returns (bool)',
        'function deposit() payable',
        'function withdraw(uint256) public'
      ],
      wallet
    );
  }
  
  async getBalances() {
    try {
      const [phrs, wphrs] = await Promise.all([
        this.wallet.provider.getBalance(this.wallet.address),
        this.wphrsContract.balanceOf(this.wallet.address)
      ]);
      
      // Get formatted values for logging
      const phrsFormatted = ethers.formatEther(phrs);
      const wphrsFormatted = ethers.formatEther(wphrs);
      
      return { phrs, wphrs, phrsFormatted, wphrsFormatted };
    } catch (error) {
      this.logger.error(`Failed to fetch balances: ${error.message}`);
      return { phrs: 0n, wphrs: 0n, phrsFormatted: '0', wphrsFormatted: '0' };
    }
  }
  
  getRandomizedAmount(baseAmount) {
    if (!PARAMS.RANDOMIZE) return baseAmount;
    
    // Skip randomization for special values
    if (baseAmount === 'all' || baseAmount === 'max') return baseAmount;
    
    const variation = PARAMS.VARIATION;
    const factor = 1 + (Math.random() * 2 - 1) * variation;
    const amount = Number(baseAmount) * factor;
    
    // Format to same number of decimal places as base
    const decimalPlaces = baseAmount.toString().split('.')[1]?.length || 0;
    return amount.toFixed(decimalPlaces);
  }
  
  async retryableOperation(operationName, operation) {
    this.retryCount = 0;
    
    while (this.retryCount <= this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        this.retryCount++;
        
        if (this.retryCount > this.maxRetries) {
          this.logger.error(`${operationName} failed after ${this.maxRetries} retries: ${error.message}`);
          throw error;
        }
        
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        this.logger.warn(`${operationName} attempt ${this.retryCount} failed: ${error.message}. Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  async wrap(index) {
    const amount = this.getRandomizedAmount(PARAMS.WRAP_AMOUNT);
    
    this.logger.tx(`Wrap ${index+1}: ${amount} PHRS → WPHRS`);
    
    return this.retryableOperation('Wrap', async () => {
      const balances = await this.getBalances();
      const required = ethers.parseEther(amount);
      
      // Ensure we have enough PHRS (with buffer for gas)
      if (balances.phrs < required + ethers.parseEther('0.0000001')) {
        this.logger.warn(`Insufficient PHRS for wrap: ${balances.phrsFormatted} < ${amount}`);
        return false;
      }
      
      // Execute the wrap (deposit)
      const tx = await this.wphrsContract.deposit({
        value: required,
        gasLimit: 100000,
        gasPrice: 0
      });
      
      this.logger.tx(`Tx hash: 0x${tx.hash.slice(2, 6)}...${tx.hash.slice(-4)}`);
      const receipt = await tx.wait();
      this.logger.success(`Wrap ${index+1} completed`);
      
      // Log the activity
      this.logger.recordActivity(
        this.wallet.address,
        'wrap',
        receipt.hash,
        'success',
        { amount, blockNumber: receipt.blockNumber }
      );
      
      return true;
    });
  }
  
  async unwrapAll() {
    this.logger.tx(`Unwrapping all remaining WPHRS balance to PHRS`);
    
    return this.retryableOperation('Unwrap All', async () => {
      const balances = await this.getBalances();
      
      if (balances.wphrs === 0n) {
        this.logger.warn(`No WPHRS balance to unwrap`);
        return false;
      }
      
      this.logger.info(`Current WPHRS balance: ${balances.wphrsFormatted}`);
      
      // Check and approve if needed
      const allowance = await this.wphrsContract.allowance(
        this.wallet.address, 
        CONFIG.contract.WPHRS
      );
      
      if (allowance < balances.wphrs) {
        this.logger.step(`Approving WPHRS for unwrapping...`);
        const approveTx = await this.wphrsContract.approve(
          CONFIG.contract.WPHRS, 
          ethers.MaxUint256
        );
        await approveTx.wait();
        this.logger.success(`WPHRS approval completed`);
      }
      
      // Execute the unwrap with full balance
      const tx = await this.wphrsContract.withdraw(balances.wphrs, {
        gasLimit: 120000,
        gasPrice: 0
      });
      
      this.logger.tx(`Tx hash: 0x${tx.hash.slice(2, 6)}...${tx.hash.slice(-4)}`);
      const receipt = await tx.wait();
      this.logger.success(`Unwrapped ${balances.wphrsFormatted} WPHRS to PHRS`);
      
      // Log the activity
      this.logger.recordActivity(
        this.wallet.address,
        'unwrap',
        receipt.hash,
        'success',
        { amount: balances.wphrsFormatted, blockNumber: receipt.blockNumber }
      );
      
      // Verify the unwrap succeeded
      const newBalances = await this.getBalances();
      if (newBalances.wphrs === 0n) {
        this.logger.success(`Unwrap successful, new WPHRS balance is zero`);
        return true;
      } else {
        this.logger.warn(`Unwrap may have partially failed, remaining WPHRS: ${newBalances.wphrsFormatted}`);
        return false;
      }
    });
  }
  
  async transfer(toAddress, index) {
    const amount = this.getRandomizedAmount(PARAMS.TRANSFER_AMOUNT);
    const truncatedAddress = `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`;
    
    this.logger.tx(`Transfer ${index+1}: ${amount} PHRS to ${truncatedAddress}`);
    
    return this.retryableOperation('Transfer', async () => {
      const balances = await this.getBalances();
      const required = ethers.parseEther(amount);
      
      if (balances.phrs < required + ethers.parseEther('0.0000001')) {
        this.logger.warn(`Insufficient PHRS for transfer: ${balances.phrsFormatted} < ${amount}`);
        return false;
      }
      
      // Execute the transfer
      const tx = await this.wallet.sendTransaction({
        to: toAddress,
        value: required,
        gasLimit: 21000,
        gasPrice: 0
      });
      
      this.logger.tx(`Tx hash: 0x${tx.hash.slice(2, 6)}...${tx.hash.slice(-4)}`);
      const receipt = await tx.wait();
      this.logger.success(`Transfer ${index+1} completed`);
      
      // Log the activity
      this.logger.recordActivity(
        this.wallet.address,
        'transfer',
        receipt.hash,
        'success',
        { amount, recipient: toAddress, blockNumber: receipt.blockNumber }
      );
      
      return true;
    });
  }
}

/**
 * Tracks statistics for operations
 */
class OperationTracker {
  constructor() {
    this.reset();
    this.startTime = Date.now();
  }
  
  reset() {
    this.walletsProcessed = 0;
    this.operations = {
      faucets: 0,
      checkins: 0,
      transfers: 0,
      wraps: 0,
      unwraps: 0
    };
    this.successfulOps = 0;
    this.totalOps = 0;
  }
  
  incrementWallet() {
    this.walletsProcessed++;
  }
  
  recordOperation(type, success) {
    if (this.operations[type] !== undefined) {
      this.operations[type]++;
    }
    
    this.totalOps++;
    
    if (success) {
      this.successfulOps++;
    }
  }
}

/**
 * Helper functions for timing and delays
 */
async function sleep(min, max) {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

async function countdown(minutes) {
  const totalSeconds = minutes * 60;
  
  for (let remaining = totalSeconds; remaining > 0; remaining--) {
    logger.countdown(remaining);
    await sleep(1000, 1000);
  }
  
  console.log('\n');
}

/**
 * Process a single wallet through all operations
 */
async function processWallet(wallet, proxy, targetAddresses, walletIndex, totalWallets, stats) {
  const shortAddress = `${wallet.address}`;
  logger.operation(walletIndex, totalWallets, shortAddress, "STARTING OPERATIONS");
  
  // Initialize handlers
  const txHandler = new TransactionHandler(wallet, logger);
  const pharosApi = new PharosAPI(wallet, logger, proxy);
  
  // Log initial balances
  const initialBalances = await txHandler.getBalances();
  logger.info(`Initial Balances - PHRS: ${initialBalances.phrsFormatted} | WPHRS: ${initialBalances.wphrsFormatted}`);
  
  // 1. STEP ONE: CLAIM FAUCET
  logger.operation(walletIndex, totalWallets, shortAddress, "STEP 1: FAUCET CLAIM");
  const faucetSuccess = await pharosApi.claimFaucet();
  stats.recordOperation('faucets', faucetSuccess);
  logger.recordStepResult("Faucet", faucetSuccess, faucetSuccess ? "Claimed successfully" : "Not available or failed");
  
  await sleep(...CONFIG.timing.betweenOps);
  
  // 2. STEP TWO: DAILY CHECK-IN
  logger.operation(walletIndex, totalWallets, shortAddress, "STEP 2: DAILY CHECK-IN");
  const checkinSuccess = await pharosApi.dailyCheckIn();
  stats.recordOperation('checkins', checkinSuccess);
  logger.recordStepResult("Check-in", checkinSuccess, checkinSuccess ? "Completed successfully" : "Already done or failed");
  
  await sleep(...CONFIG.timing.betweenOps);
  
  // 3. STEP THREE: TRANSFERS
  logger.operation(walletIndex, totalWallets, shortAddress, "STEP 3: TRANSFERS");
  let transferCount = 0;
  
  // Skip transfers if no target addresses
  if (targetAddresses.length === 0) {
    logger.warn("No target addresses found in wallets.txt. Skipping transfers.");
  } else {
    for (let i = 0; i < PARAMS.TRANSFER_COUNT; i++) {
      // Select a random address from the target list
      const randomIndex = Math.floor(Math.random() * targetAddresses.length);
      const targetAddress = targetAddresses[randomIndex];
      
      const success = await txHandler.transfer(targetAddress, i);
      stats.recordOperation('transfers', success);
      
      if (success) transferCount++;
      
      await sleep(...CONFIG.timing.betweenOps);
    }
  }
  
  logger.info(`Completed ${transferCount}/${PARAMS.TRANSFER_COUNT} transfers`);
  logger.recordStepResult("Transfers", transferCount > 0, `${transferCount}/${PARAMS.TRANSFER_COUNT} completed`);
  
  await sleep(...CONFIG.timing.betweenOps);
  
  // 4. STEP FOUR: WRAP PHRS TO WPHRS
  logger.operation(walletIndex, totalWallets, shortAddress, "STEP 4: WRAP PHRS → WPHRS");
  let wrapCount = 0;
  
  for (let i = 0; i < PARAMS.WRAP_COUNT; i++) {
    const success = await txHandler.wrap(i);
    stats.recordOperation('wraps', success);
    
    if (success) wrapCount++;
    
    await sleep(...CONFIG.timing.betweenOps);
  }
  
  logger.info(`Completed ${wrapCount}/${PARAMS.WRAP_COUNT} wraps`);
  logger.recordStepResult("Wraps", wrapCount > 0, `${wrapCount}/${PARAMS.WRAP_COUNT} completed`);
  
  await sleep(...CONFIG.timing.betweenOps);
  
  // 5. STEP FIVE: UNWRAP ALL WPHRS TO PHRS
  logger.operation(walletIndex, totalWallets, shortAddress, "STEP 5: UNWRAP ALL WPHRS → PHRS");
  
  const unwrapSuccess = await txHandler.unwrapAll();
  stats.recordOperation('unwraps', unwrapSuccess);
  logger.recordStepResult("Unwrap", unwrapSuccess, unwrapSuccess ? "Unwrapped all WPHRS" : "No WPHRS to unwrap or failed");
  
  // Get final balances
  const finalBalances = await txHandler.getBalances();
  logger.info(`Final Balances - PHRS: ${finalBalances.phrsFormatted} | WPHRS: ${finalBalances.wphrsFormatted}`);
  
  // Record wallet completion
  stats.incrementWallet();
  logger.success(`Wallet ${walletIndex + 1} processing completed`);
}

// Initialize logger
const logger = new Logger();

/**
 * Main execution function
 */
async function main() {
  // Clear terminal screen when bot starts
  process.stdout.write('\x1Bc'); // This is a more reliable way to clear the screen
  console.clear(); // Backup clear method
  
  logger.banner();
  
  // Load configuration data
  const privateKeys = FileManager.loadPrivateKeys();
  const proxyList = FileManager.loadProxies();
  const targetAddresses = FileManager.loadWalletAddresses();
  
  if (privateKeys.length === 0) {
    logger.error("No private keys found. Add keys to privatekeys.txt or set PRIVATE_KEY_X env vars.");
    process.exit(1);
  }
  
  const proxyManager = new ProxyManager(proxyList);
  const stats = new OperationTracker();
  
  // Simplified configuration log - one line
  logger.info(`Config: ${privateKeys.length} WALLET | ${targetAddresses.length} ADDRESS | ${proxyList.length} PROXY`);
  
  // Main execution loop
  while (true) {
    logger.info(`=== STARTING NEW CYCLE ===`);
    stats.reset();
    
    for (let i = 0; i < privateKeys.length; i++) {
      try {
        // Get a proxy and create provider
        const proxy = proxyManager.getNext();
        let provider;
        
        try {
          if (proxy) {
            logger.info(`Using proxy: ${proxy.split('@')[1] || proxy.substring(0, 30)}...`);
            const agent = new HttpsProxyAgent(proxy);
            provider = new ethers.JsonRpcProvider(
              CONFIG.network.rpcUrl,
              {
                chainId: CONFIG.network.chainId,
                name: CONFIG.network.name,
              },
              {
                fetchOptions: { agent },
                headers: { 'User-Agent': randomUseragent.getRandom() },
              }
            );
          } else {
            logger.info('No proxy available, using direct connection');
            provider = new ethers.JsonRpcProvider(
              CONFIG.network.rpcUrl,
              {
                chainId: CONFIG.network.chainId,
                name: CONFIG.network.name,
              }
            );
          }
          
          // Create wallet instance
          const wallet = new ethers.Wallet(privateKeys[i], provider);
          
          // Process wallet
          await processWallet(wallet, proxy, targetAddresses, i, privateKeys.length, stats);
          
          // Record proxy success
          if (proxy) {
            proxyManager.recordSuccess(proxy);
          }
        } catch (error) {
          logger.error(`Error processing wallet ${i + 1}: ${error.message}`);
          
          // Record proxy failure
          if (proxy) {
            proxyManager.recordFailure(proxy);
          }
        }
        
        // Wait between wallets
        await sleep(...CONFIG.timing.betweenWallets);
      } catch (error) {
        logger.error(`Critical error with wallet ${i + 1}: ${error.message}`);
      }
    }
    
    const proxyStats = proxyManager.getStats();
    logger.info(`Cycle completed - Proxy Status: ${proxyStats.available}/${proxyStats.total} available`);
    
    // Wait before next cycle - skip the info message and go directly to countdown
    await countdown(CONFIG.timing.cycleInterval);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived shutdown signal. Exiting gracefully...');
  process.exit(0);
});

// Start the bot
main().catch(error => {
  logger.error(`Critical error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
