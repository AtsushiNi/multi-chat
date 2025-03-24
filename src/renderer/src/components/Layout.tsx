import React from 'react';
import Sidebar from './Sidebar';
import { Outlet, useNavigate } from 'react-router-dom';
import { createStyles } from 'antd-style';

const defaultConversationsItems = [
  {
    key: '0',
    label: 'What is Ant Design X?',
  },
];

const useStyle = createStyles(({ token, css }) => ({
  layout: css`
    width: 100%;
    min-width: 1000px;
    height: 100vh;
    border-radius: ${token.borderRadius}px;
    display: flex;
    background: ${token.colorBgContainer};
    font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
  `,
  content: css`
    flex: 1;
    padding: ${token.paddingLG}px;
  `,
}));

const Layout: React.FC = () => {
  const { styles } = useStyle();
  const navigate = useNavigate();
  const [conversationsItems, setConversationsItems] = React.useState(defaultConversationsItems);
  const [activeKey, setActiveKey] = React.useState(defaultConversationsItems[0].key);

  const onNavigateToServers = (): void => {
    navigate('/servers');
  };

  const onNavigateToChat = (): void => {
    navigate('/chat');
  };

  const onAddConversation = (): void => {
    setConversationsItems([
      ...conversationsItems,
      {
        key: `${conversationsItems.length}`,
        label: `New Conversation ${conversationsItems.length}`,
      },
    ]);
    setActiveKey(`${conversationsItems.length}`);
  };

  const onConversationClick = (key: string): void => {
    setActiveKey(key);
  };

  return (
    <div className={styles.layout}>
      <Sidebar
        conversationsItems={conversationsItems}
        activeKey={activeKey}
        onAddConversation={() => {
          onAddConversation();
          onNavigateToChat();
        }}
        onConversationClick={(key) => {
          onConversationClick(key);
          onNavigateToChat();
        }}
        onNavigateToServers={onNavigateToServers}
      />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
