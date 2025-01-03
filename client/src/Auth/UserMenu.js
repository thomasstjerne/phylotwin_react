import React, { PureComponent } from "react";
//import injectSheet from "react-jss";
import { useNavigate } from "react-router-dom";
import { LogoutOutlined, BarsOutlined } from "@ant-design/icons";
import { Menu, Dropdown, Avatar, Modal, Button, Divider } from "antd";

// Wrappers
import withContext from "../Components/hoc/withContext";
// Components
import LoginForm from "./LoginForm"
const hashCode = function (str) {
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

const styles = {
  avatar: {
    "& img": {
      imageRendering: "crisp-edges",
      fallbacks: {
        imageRendering: "pixelated",
      },
    },
  },
};


const MenuContent = ({logout}) => {

  const navigate = useNavigate()

  return <Menu selectedKeys={[]}>
  <Menu.Item
    key="logout"
    onClick={() => {
      logout();
      window.location.reload();
    }}
  >
    <LogoutOutlined /> Logout
  </Menu.Item>
  <Menu.Item
    key="myruns"
    onClick={() => navigate('/myruns')}
  >
    <BarsOutlined /> Pipeline Runs
  </Menu.Item>
</Menu>
} 

class UserMenu extends PureComponent {
  state = {
    visible: false,
    invalid: false,
  };

  showLogin = () => {
    this.setState({
      visible: true,
    });
  };
  reset = () => {
    this.setState(
      {
        visible: false,
        invalid: false,
      },
      () => window.location.reload()
    );
  }

  handleLogin = (values) => {
    this.props
      .login(values)
      .then((user)=>{
        this.setState({ 
            visible: false,
            invalid: false
        })
      })
      .catch((err) => {
        this.setState({ invalid: err.message });
      });
  };

  handleCancel = () => {
    this.setState({
      visible: false,
      invalid: false,
    });
  };

  render() {
    const { user, logout } = this.props;
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
            <Button htmlType="button" type="primary" onClick={this.showLogin}>
              Login
            </Button>
          </span>
        )}
        {user && (
          <Dropdown overlay={<MenuContent logout={logout}/>} trigger={["click"]}>
            <span style={{ padding: "0 10px", cursor: "pointer" }}>
              <Avatar
                style={{ marginRight: 8 }}
                size="small"
               // className={classes.avatar}
                src={currentUser.avatar}
                alt="avatar"
              />
              <span>{currentUser.name}</span>
            </span>
          </Dropdown>
        )}
        <Modal
          title="Login with your GBIF account"
          visible={this.state.visible}
          onOk={this.handleLogin}
          onCancel={this.handleCancel}
          footer={null}
          destroyOnClose={true}
        >
          <div /* className={classes.background} */>
            
            {<LoginForm
              invalid={this.state.invalid}
              onLogin={this.handleLogin}
            />}
          </div>
        </Modal>
      </React.Fragment>
    );
  }
}

const mapContextToProps = ({ user, login, logout }) => ({
  user,
  login,
  logout
});

export default withContext(mapContextToProps)(UserMenu);
