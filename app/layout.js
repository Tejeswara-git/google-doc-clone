import './globals.css';
import { UserProvider } from './UserContext';
import Header from './components/Header';

export const metadata = {
  title: 'DocEditor',
  description: 'Lightweight collaborative document editor',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <div className="app-container">
            <Header />
            <main className="main-content">
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
