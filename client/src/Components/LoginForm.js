import React from "react";
import { Form, Input, Button, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

const LoginForm = ({ onLogin, invalid }) => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    onLogin(values);
  };

  const handleDevLogin = () => {
    onLogin({ username: 'dev_user', password: 'dev_password' });
  };

  return (
    <Form
      form={form}
      name="login"
      onFinish={onFinish}
      style={{ maxWidth: 300, margin: "0 auto" }}
    >
      {invalid && (
        <Form.Item>
          <Alert message={invalid} type="error" />
        </Form.Item>
      )}
      <Form.Item
        name="username"
        rules={[{ required: true, message: "Please input your username!" }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="Username"
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "Please input your password!" }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Password"
          size="large"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block size="large">
          Log in
        </Button>
      </Form.Item>
      {process.env.REACT_APP_DEV_MODE === 'true' && (
        <Form.Item>
          <Button 
            type="link" 
            block
            onClick={handleDevLogin}
          >
            Use Dev Mode Login
          </Button>
        </Form.Item>
      )}
    </Form>
  );
};

export default LoginForm; 