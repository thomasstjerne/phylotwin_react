import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { LogoutOutlined, BarsOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { Menu, Dropdown, Avatar, Modal, Button } from "antd";
import { useAuth } from '../Auth/AuthContext';
import LoginForm from "./LoginForm";
import { useDispatch } from 'react-redux';
import { 
  resetResults,
  resetVisualization,
  resetMapState,
  updateMapCenter,
  updateMapZoom,
  setPipelineStatus
} from '../store/actions';

const hashCode = function (str) {
  if (!str) return 0;
  let hash = 0,
    i,
    chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

const MenuContent = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { logout } = useAuth();

  const handleStartNewAnalysis = () => {
    // First reset all Redux states
    dispatch(setPipelineStatus('idle'));
    dispatch(resetResults());
    dispatch(resetVisualization());
    dispatch(resetMapState());
    dispatch(updateMapCenter([20, 0]));
    dispatch(updateMapZoom(2));
    
    // Then navigate to /run with replace to clear URL params
    navigate('/run', { replace: true });
    
    // Finally, force a reload to ensure a completely fresh state
    setTimeout(() => {
      window.location.reload();
    }, 0);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Menu selectedKeys={[]}>
      <Menu.Item
        key="newrun"
        onClick={handleStartNewAnalysis}
      >
        <PlayCircleOutlined /> Start new analysis
      </Menu.Item>
      <Menu.Item
        key="history"
        onClick={() => navigate('/myruns')}
      >
        <BarsOutlined /> Run history
      </Menu.Item>
      <Menu.Item
        key="logout"
        onClick={handleLogout}
      >
        <LogoutOutlined /> Logout
      </Menu.Item>
    </Menu>
  );
};

const UserMenu = () => {
  const navigate = useNavigate();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const { user, login } = useAuth();

  const handleLogin = async (values) => {
    try {
      await login(values);
      setLoginModalVisible(false);
      setLoginError(null);
      navigate('/run', { replace: true });
    } catch (err) {
      setLoginError(err.message);
    }
  };

  let currentUser;
  if (user) {
    const imgNr = Math.abs(hashCode(user.userName)) % 10;
    currentUser = {
      name: user.userName,
      avatar: `/_palettes/${imgNr}.png`,
    };
  }

  return (
    <React.Fragment>
      {!user && (
        <span style={{ padding: "0 10px" }}>
          <Button htmlType="button" type="primary" onClick={() => setLoginModalVisible(true)}>
            Login
          </Button>
          {process.env.REACT_APP_DEV_MODE === 'true' && (
            <Button 
              htmlType="button" 
              type="link" 
              onClick={() => handleLogin({ username: 'dev_user', password: 'dev_password' })}
              style={{ marginLeft: 8 }}
            >
              Dev Login
            </Button>
          )}
        </span>
      )}
      {user && (
        <Dropdown overlay={<MenuContent />} trigger={["click"]}>
          <span style={{ padding: "0 10px", cursor: "pointer" }}>
            <Avatar
              style={{ marginRight: 8 }}
              size="small"
              src={currentUser.avatar}
              alt="avatar"
            />
            <span>{currentUser.name}</span>
          </span>
        </Dropdown>
      )}
      <Modal
        title="Login with your GBIF account"
        visible={loginModalVisible}
        onCancel={() => {
          setLoginModalVisible(false);
          setLoginError(null);
        }}
        footer={null}
        destroyOnClose={true}
      >
        <div>
          <LoginForm
            invalid={loginError}
            onLogin={handleLogin}
          />
        </div>
      </Modal>
    </React.Fragment>
  );
};

export default UserMenu; 