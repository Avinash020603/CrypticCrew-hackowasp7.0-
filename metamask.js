// MetaMask connection handler
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            // Check if we're on the correct network (Mega testnet)
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0x18C6') { // 6342 in hex
                try {
                    // Try to switch to Mega testnet
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x18C6' }],
                    });
                } catch (switchError) {
                    // If the network isn't added, add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x18C6',
                                chainName: 'Mega Testnet',
                                nativeCurrency: {
                                    name: 'MegaETH',
                                    symbol: 'MegaETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://carrot.megaeth.com/rpc'],
                                blockExplorerUrls: ['https://megaexplorer.xyz']
                            }]
                        });
                    }
                }
            }
            
            // Get the balance
            const web3 = new Web3(window.ethereum);
            const balance = await web3.eth.getBalance(accounts[0]);
            const balanceInEth = web3.utils.fromWei(balance, 'ether');
            
            // Send both account and balance to Streamlit
            window.parent.postMessage({
                type: "wallet_connected",
                address: accounts[0],
                balance: balanceInEth
            }, "*");
            
            // Setup event listeners for account and network changes
            window.ethereum.on('accountsChanged', async function (accounts) {
                if (accounts.length > 0) {
                    const newBalance = await web3.eth.getBalance(accounts[0]);
                    const newBalanceInEth = web3.utils.fromWei(newBalance, 'ether');
                    window.parent.postMessage({
                        type: "wallet_changed",
                        address: accounts[0],
                        balance: newBalanceInEth
                    }, "*");
                } else {
                    window.parent.postMessage({
                        type: "wallet_disconnected"
                    }, "*");
                }
            });

            window.ethereum.on('chainChanged', async function (newChainId) {
                if (newChainId !== '0x18C6') {
                    window.parent.postMessage({
                        type: "wrong_network",
                        message: "Please switch to Mega Testnet"
                    }, "*");
                } else {
                    // Refresh balance on chain change
                    const chainAccounts = await web3.eth.getAccounts();
                    if (chainAccounts.length > 0) {
                        const newBalance = await web3.eth.getBalance(chainAccounts[0]);
                        const newBalanceInEth = web3.utils.fromWei(newBalance, 'ether');
                        window.parent.postMessage({
                            type: "wallet_changed",
                            address: chainAccounts[0],
                            balance: newBalanceInEth
                        }, "*");
                    }
                }
            });

            return accounts[0];
        } catch (error) {
            console.error('User rejected connection:', error);
            window.parent.postMessage({
                type: "wallet_error",
                error: error.message
            }, "*");
            return null;
        }
    } else {
        console.error('MetaMask is not installed');
        window.parent.postMessage({
            type: "wallet_error",
            error: "Please install MetaMask"
        }, "*");
        return null;
    }
}

// Function to get account balance
async function getBalance(address) {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const web3 = new Web3(window.ethereum);
            const balance = await web3.eth.getBalance(address);
            return web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }
    return '0';
} 