import React, { useEffect, useState } from "react";
import axios from "axios"
import { useNavigate } from "react-router-dom";
import PageContent from "../Layout/PageContent";
import { marked } from "marked"
import { Image, Row, Col, Typography, Space, Card } from "antd";
import UserMenu from "../Components/UserMenu";
import styled from '@emotion/styled';

const { Title, Text, Link } = Typography;

const PartnerLogo = styled(Image)`
  filter: grayscale(100%);
  transition: filter 0.3s ease;
  cursor: pointer;
  height: 60px;
  object-fit: contain;

  &:hover {
    filter: grayscale(0%);
  }
`;

const StyledCard = styled(Card)`
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

function App() {
  const [markdown, setMarkdown] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const getAbout = async () => {
      try {
        const res = await axios(`/ABOUT.md`);
        setMarkdown(res.data);
        setError(false);
      } catch (error) {
        console.log(error);
        setError(true);
      }
    }
    getAbout();
  }, []);
  
  return (
    <PageContent>
      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 48 }}>
        <Col>
        <Image
            width={300}
            src="/assets/logo_BioDT.svg"
            preview={false}
          />
          <Image
            width={100}
            src="/assets/PhyloDiv_Icon.png"
            preview={false}
          />
        </Col>
        <Col flex="auto">
          <Title level={1} style={{ margin: 0 }}>PhyloNext v2</Title>
          <Text>A powerful tool for phylogenetic analysis and visualization</Text>
        </Col>
        <Col>
          <UserMenu />
        </Col>
      </Row>

      <StyledCard>
        {error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text>Failed to load content</Text>
          </div>
        ) : (
          markdown && (
            <span
              dangerouslySetInnerHTML={{
                __html: marked(markdown),
              }}
            />
          )
        )}
      </StyledCard>

      <StyledCard title="Resources" style={{ marginTop: 24 }}>
        <Space direction="vertical">
          <Text>
            Publication:{' '}
            <Link href="https://doi.org/10.3897/rio.10.e124988" target="_blank">
              Mikryukov V, Abarenkov K, Jeppesen TS, Schigel D, Frøslev T (2024) Prototype Biodiversity Digital Twin: Phylogenetic Diversity. Research Ideas and Outcomes 10: e124988.
            </Link>
          </Text>
        </Space>
      </StyledCard>

      <StyledCard title="Involved Partners" style={{ marginTop: 24 }}>
        <Row gutter={[48, 24]} justify="center" align="middle">
          <Col>
            <Link href="https://gbif.org" target="_blank">
              <PartnerLogo
                preview={false}
                width={300}
                src="/assets/logo_GBIF.png"
                alt="GBIF"
              />
            </Link>
          </Col>
          <Col>
            <Link href="https://ut.ee" target="_blank">
              <PartnerLogo
                preview={false}
                width={190}
                src="/assets/logo_UniversityOfTartu.png"
                alt="University of Tartu"
              />
            </Link>
          </Col>
        </Row>
      </StyledCard>
    </PageContent>
  );
}

export default App;