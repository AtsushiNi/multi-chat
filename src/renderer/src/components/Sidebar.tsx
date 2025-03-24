import React from 'react';
import { Button, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import Conversations from '@ant-design/x/es/conversations';

interface SidebarProps {
  conversationsItems: {
    key: string;
    label: string;
  }[];
  activeKey: string;
  onAddConversation: () => void;
  onConversationClick: (key: string) => void;
  onNavigateToServers: () => void;
}

const useStyle = createStyles(({ token, css }) => ({
  menu: css`
    background: ${token.colorBgLayout}80;
    width: 280px;
    height: 100%;
    display: flex;
    flex-direction: column;
  `,
  conversations: css`
    padding: 0 12px;
    flex: 1;
    overflow-y: auto;
  `,
  logo: css`
    display: flex;
    height: 72px;
    align-items: center;
    justify-content: start;
    padding: 0 24px;
    box-sizing: border-box;

    img {
      width: 24px;
      height: 24px;
      display: inline-block;
    }

    span {
      display: inline-block;
      margin: 0 8px;
      font-weight: bold;
      color: ${token.colorText};
      font-size: 16px;
    }
  `,
  addBtn: css`
    background: #1677ff0f;
    border: 1px solid #1677ff34;
    width: calc(100% - 24px);
    margin: 0 12px 24px 12px;
  `,
  mcpBtn: css`
    background: #722ed10f;
    border: 1px solid #722ed134;
    width: calc(100% - 24px);
    margin: 0 12px 24px 12px;
    color: #722ed1;
    &:hover {
      background: #722ed11a;
    }
  `,
}));

const Sidebar: React.FC<SidebarProps> = ({
  conversationsItems,
  activeKey,
  onAddConversation,
  onConversationClick,
  onNavigateToServers,
}) => {
  const { styles } = useStyle();

  const logoNode = (
    <div className={styles.logo}>
      <img
        src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
        draggable={false}
        alt="logo"
      />
      <span>Ant Design X</span>
    </div>
  );

  return (
    <div className={styles.menu}>
      {logoNode}
      <Button
        onClick={onAddConversation}
        type="link"
        className={styles.addBtn}
        icon={<PlusOutlined />}
      >
        New Conversation
      </Button>
      <Conversations
        items={conversationsItems}
        className={styles.conversations}
        activeKey={activeKey}
        onActiveChange={onConversationClick}
      />
      <Divider />
      <Button className={styles.mcpBtn} onClick={onNavigateToServers}>
        MCP Servers
      </Button>
    </div>
  );
};

export default Sidebar;
