# 🌡️ Token-Incentivized Community Health Reporting App

Welcome to a decentralized solution for early outbreak detection in underserved areas! This Web3 project empowers communities to report health incidents transparently on the Stacks blockchain using Clarity smart contracts. By incentivizing accurate reporting with tokens, it enables faster response to potential outbreaks, bridging gaps in traditional health surveillance systems.

## ✨ Features

🔒 Anonymous yet verifiable health incident reporting  
💰 Token rewards for contributors and validators  
📊 Aggregated data for real-time outbreak alerts  
🗳 Community-driven validation to ensure accuracy  
🏆 Reputation system to build trust among users  
⚖️ Governance for community-led improvements  
🌍 Focus on underserved regions with location-based tagging  
🔄 Immutable records for accountability and analysis  

## 🛠 How It Works

**For Reporters**  
- Register as a user (optional for basic reporting, required for rewards).  
- Submit a health report with details like symptoms, location, and timestamp.  
- If validated by the community, earn tokens from the reward pool.  

**For Validators**  
- Stake tokens to become a validator.  
- Review and vote on submitted reports.  
- Earn rewards for accurate validations; lose stake for malicious behavior.  

**For Health Authorities/Observers**  
- Query aggregated data to detect outbreak patterns.  
- Trigger on-chain alerts when thresholds are met.  

**Token Economy**  
- HealthTokens (HT) are minted and distributed as incentives.  
- Rewards are pulled from a community-funded pool.  
- Governance proposals can adjust reward rates and thresholds.  

The system is built with 8 interconnected Clarity smart contracts for modularity, security, and scalability.

## 📜 Smart Contracts Overview

1. **HealthToken.clar**  
   A fungible token contract (STX-20 equivalent) for issuing and managing HT tokens used for incentives and staking.  
   - Functions: mint, transfer, burn, balance-of.  

2. **UserRegistry.clar**  
   Handles user registration, including optional profile data and reputation scores.  
   - Functions: register-user, update-reputation, get-user-info.  

3. **ReportSubmission.clar**  
   Allows users to submit health reports with hashed details (e.g., symptoms, geolocation hash for privacy).  
   - Functions: submit-report, get-report-by-id, list-pending-reports.  

4. **ReportValidation.clar**  
   Manages community validation through voting or consensus mechanisms.  
   - Functions: vote-on-report, finalize-validation, check-validation-status.  

5. **RewardPool.clar**  
   Oversees the pool of tokens funded by donations or initial minting for reward distribution.  
   - Functions: deposit-to-pool, get-pool-balance, withdraw-for-rewards.  

6. **RewardDistribution.clar**  
   Calculates and distributes tokens to reporters and validators based on validated reports.  
   - Functions: claim-reward, distribute-batch, calculate-reward-amount.  

7. **AlertThreshold.clar**  
   Monitors aggregated report data and emits events for potential outbreaks when thresholds (e.g., report count per area) are exceeded.  
   - Functions: aggregate-reports, check-threshold, trigger-alert.  

8. **Governance.clar**  
   Enables token holders to propose and vote on changes like reward rates or validation rules.  
   - Functions: create-proposal, vote-on-proposal, execute-proposal.  

## 🚀 Getting Started

1. Set up a Stacks wallet and acquire STX for gas fees.  
2. Deploy the contracts in order (starting with HealthToken and UserRegistry).  
3. Interact via Clarity console or a frontend dApp:  
   - Call `submit-report` in ReportSubmission with your data.  
   - Stake and validate via ReportValidation.  
   - Claim rewards from RewardDistribution.  

This project promotes public health equity by leveraging blockchain for trustless, incentivized data collection—perfect for regions with limited infrastructure!