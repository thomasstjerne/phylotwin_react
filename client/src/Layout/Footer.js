import React from 'react';
import { Layout as AntLayout, Typography as AntTypography, Button, theme, Spin, Dropdown, Tooltip, message, Tour, Row, Col } from 'antd';


const {  Footer } = AntLayout;
const { Text, Link } = AntTypography;

export default ({ align }) => {
 const {
    token: { colorBgContainer },
  } = theme.useToken();
    return   <Footer style={{ textAlign: 'start', padding: '8px 16px', background: colorBgContainer }}>
    <Row>
      <Col flex="auto" />
      
      <Col span={12}>
        <Text style={{ fontSize: '10px', lineHeight: '1.6', textAlign: 'left' }}>
          This project has received funding from the European Union's Horizon Europe research and innovation programme under grant agreement No 101057437 (BioDT project,{" "}
          <Link href="https://doi.org/10.3030/101057437" target="_blank">
            https://doi.org/10.3030/101057437
          </Link>).
        </Text>
      </Col>
      <Col>
        <img
          src="/EN_FundedbytheEU_RGB_POS.png"
          alt="Funded by the EU Logo"
          style={{
            height: '46px',
            width: 'auto'
          }}
        />
      </Col>
      {align !== "right" && <Col flex="auto" />}
    </Row>
  </Footer>
}

