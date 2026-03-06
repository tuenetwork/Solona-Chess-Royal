import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';

export const CustomWalletButton = () => {
    const { setVisible } = useWalletModal();
    const { publicKey, wallet, disconnect, connecting, connected } = useWallet();
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            const node = ref.current;
            if (!node || node.contains(event.target as Node)) return;
            setMenuOpen(false);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, []);

    const content = useMemo(() => {
        if (publicKey) {
            const base58 = publicKey.toBase58();
            return base58.slice(0, 4) + '..' + base58.slice(-4);
        } else if (connecting) {
            return 'Connecting... (Cancel)';
        } else if (wallet) {
            return 'Connect';
        } else {
            return 'Select Wallet';
        }
    }, [publicKey, wallet, connecting]);

    const handleClick = () => {
        if (connecting) {
            // If stuck connecting, allow them to disconnect/cancel
            disconnect().catch(() => {});
            setVisible(true);
        } else if (connected) {
            setMenuOpen(!menuOpen);
        } else {
            setVisible(true);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleClick}
                className="wallet-adapter-button !bg-white !text-black !font-bold !rounded-full !px-6 !py-2 !transition-all hover:!scale-105 active:!scale-95 !h-auto !text-sm !font-sans flex items-center gap-2"
            >
                {wallet && <WalletIcon wallet={wallet} className="w-5 h-5" />}
                {content}
            </button>
            
            {menuOpen && connected && (
                <ul className="absolute top-full right-0 mt-2 bg-card-bg border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[99999] min-w-[150px]">
                    <li
                        className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm font-sans transition-colors"
                        onClick={async () => {
                            if (publicKey) {
                                await navigator.clipboard.writeText(publicKey.toBase58());
                                setCopied(true);
                                setTimeout(() => setCopied(false), 400);
                            }
                        }}
                    >
                        {copied ? 'Copied' : 'Copy address'}
                    </li>
                    <li
                        className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm font-sans transition-colors"
                        onClick={() => {
                            setVisible(true);
                            setMenuOpen(false);
                        }}
                    >
                        Change wallet
                    </li>
                    <li
                        className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm font-sans transition-colors text-red-400"
                        onClick={() => {
                            disconnect().catch(() => {});
                            setMenuOpen(false);
                        }}
                    >
                        Disconnect
                    </li>
                </ul>
            )}
        </div>
    );
};
