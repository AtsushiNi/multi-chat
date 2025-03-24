import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Chat from './components/Chat';
import Servers from './components/Servers';
import Layout from './components/Layout';
import './assets/main.css';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Chat />} />
          <Route path="chat" element={<Chat />} />
          <Route path="servers" element={<Servers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
