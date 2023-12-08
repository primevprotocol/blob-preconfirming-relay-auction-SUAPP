"use client";
import React, { useState, useEffect } from 'react';
import { custom, formatEther, encodeFunctionData, Address } from 'viem';
import { suaveRigil } from 'viem/chains';
import { TransactionRequestSuave, TransactionReceiptSuave } from 'viem/chains';
import { deployedAddress } from '@/constants/addresses';
import OnChainState from '../../forge/out/OnChainState.sol/OnChainState.json';
import Header from '@/components/Header';
import Links from '@/components/Links';

type SuaveWallet = ReturnType<typeof suaveRigil.newWallet>;
type SuaveProvider = ReturnType<typeof suaveRigil.newPublicClient>;

export default function Home() {
  const [suaveWallet, setSuaveWallet] = useState<SuaveWallet>();
  const [balance, setBalance] = useState<string>();
  const [provider, setProvider] = useState<SuaveProvider>();
  const [hash, setHash] = useState('');
  const [contractState, setContractState] = useState('');
  const [pendingReceipt, setPendingReceipt] = useState<Promise<any>>();
  const [receivedReceipt, setReceivedReceipt] = useState<TransactionReceiptSuave>();

  useEffect(() => {
    if (provider) {
      fetchBalance();
    }
    if (pendingReceipt) {
      pendingReceipt.then((receipt) => {
        setReceivedReceipt(receipt);
        setPendingReceipt(undefined);
      });
    }
  }, [suaveWallet, hash, pendingReceipt]);

  const connectWallet = async () => {
    const ethereum = window.ethereum
    if (ethereum) {
      try {
        const [account] = await ethereum.request({ method: 'eth_requestAccounts' });
        setSuaveWallet(suaveRigil.newWallet({
          jsonRpcAccount: account as Address,
          transport: custom(ethereum),
        }) as SuaveWallet)
        const suaveProvider = suaveRigil.newPublicClient(custom(ethereum));
        setProvider(suaveProvider);
      } catch (error) {
        console.error("Error connecting to wallet:", error);
      }
    } else {
      console.log('Please install a browser wallet');
    }
  };

  const fetchBalance = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const balanceFetched = await provider.getBalance({ address: suaveWallet.account.address });
    setBalance(formatEther(balanceFetched));
  };


  const getFunds = async () => {
    // default funded key in local SUAVE devenv
    const privateKey = '0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12';
    const fundingWallet = suaveRigil.newWallet({ privateKey: privateKey, transport: custom(window.ethereum) });
    const fundTx = {
      to: suaveWallet?.account.address,
      value: 1000000000000000000n,
      type: '0x0' as '0x0',
      gas: 21000n,
      gasPrice: 1000000000n,
    } as TransactionRequestSuave;
    const sendRes = await fundingWallet.sendTransaction(fundTx);
    setHash(sendRes);
  }

  const sendExample = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const nonce = await provider.getTransactionCount({ address: suaveWallet.account.address });
    const ccr: TransactionRequestSuave = {
      confidentialInputs: '0x',
      kettleAddress: '0xB5fEAfbDD752ad52Afb7e1bD2E40432A485bBB7F', // Use 0x03493869959C866713C33669cA118E774A30A0E5 on Rigil.
      to: deployedAddress,
      gasPrice: 2000000000n,
      gas: 100000n,
      type: '0x43',
      chainId: 16813125, // chain id of local SUAVE devnet and Rigil
      data: encodeFunctionData({
        abi: OnChainState.abi,
        functionName: 'example',
      }),
      nonce
    };
    const hash = await suaveWallet.sendTransaction(ccr);
    console.log(`Transaction hash: ${hash}`);
    setPendingReceipt(provider.waitForTransactionReceipt({ hash }));
  }

  const sendNilExample = async () => {
    alert("A confidential request fails if it tries to modify the state directly.")
  }

  const fetchState = async () => {
    if (!provider || !suaveWallet) {
      console.warn(`provider=${provider}\nsuaveWallet=${suaveWallet}`)
      return
    }
    const data = await provider.readContract({
      address: deployedAddress,
      abi: OnChainState.abi,
      functionName: 'state',
    });
    const toDisplay = (data as any).toString();
    console.log(toDisplay);
    setContractState(toDisplay);
  };

  const account = suaveWallet?.account.address;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Header />
      <div className="flex flex-col gap-4 lg:flex-row w-[1024px]">
        <div className="flex-auto border border-gray-300 bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:rounded-xl p-10">
          <p className='text-2xl font-bold mt-4 mb-8'>
            Account Actions
          </p>
          <div className="relative flex my-8">
            {account ?
              <div>
                <p><b>Connected Account:</b></p>
                <code>{suaveWallet.account.address ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</code>
              </div> :
              <button
                className='border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'
                onClick={connectWallet}
              >
                Connect Wallet
              </button>}
          </div>
          <div className="relative flex my-8">
            <p><b>Your balance:</b> {balance}</p>
          </div>
          {account && (
            <div className="relative flex my-8">
              <button
                className='border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'
                onClick={getFunds}
              >
                Get Funds
              </button>
            </div>
          )}
        </div>

        <div className="flex-auto border border-gray-300 bg-gradient-to-b from-zinc-200 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:rounded-xl p-10">
          <p className='text-2xl font-bold mt-4 mb-8'>
            Contract Actions
          </p>
          <p>Your contract is deployed locally at <code><b>{deployedAddress.slice(0, 6)}...{deployedAddress.slice(-4)}</b></code></p>

          {account && (
            <div>
              <div className='flex flex-col col-2 md:flex-row'>
                <div className='border border-gray-300 rounded-xl mx-2 my-4 p-4 w-full'>
                  <p className='text-l font-bold'>Use callback</p>
                  <button
                    className='mt-4 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'
                    onClick={sendExample}
                  >
                    example()
                  </button>
                </div>
                <div className='border border-gray-300 rounded-xl mx-2 my-4 p-4 w-full'>
                  <p className='text-l font-bold'>Change directly</p>
                  <button
                    className='mt-4 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'
                    onClick={sendNilExample}
                  >
                    nilExample()
                  </button>
                </div>
              </div>
              <div>
                <button
                  className='mt-4 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'
                  onClick={fetchState}
                >
                  State: {contractState}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hash && <div>
        <p>Funded wallet at tx hash {hash}</p>
      </div>}

      {pendingReceipt && <div>
        {/* TODO: animate the ellipsis */}
        <p>Fund transaction {hash} pending...</p>
      </div>}

      {receivedReceipt && <div>
        <p>Confidential Compute Request {receivedReceipt.transactionHash} <span style={{ color: receivedReceipt.status === 'success' ? '#0f0' : '#f00' }}>{receivedReceipt.status}</span></p>
      </div>}

      <Links />

    </main>
  )
}
