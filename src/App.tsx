import { SolanaWalletProvider } from './components/WalletProvider';
import ChessGame from './components/ChessGame';

export default function App() {
  return (
    <SolanaWalletProvider>
      <ChessGame />
    </SolanaWalletProvider>
  );
}
