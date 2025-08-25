import React, { useEffect, useState } from "react";
import axios from "axios"
import { useNavigate } from "react-router-dom";
import PageContent from "../Layout/PageContent";
import { marked } from "marked"
import { Image, Row, Col, Typography, Space, Card, Button, Alert } from "antd";
import styled from '@emotion/styled';
import { useAuth } from '../Auth/AuthContext';
import { useDispatch } from 'react-redux';
import { 
  resetResults,
  resetVisualization,
  resetMapState,
  updateMapCenter,
  updateMapZoom,
  setPipelineStatus
} from '../store/actions';

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
  
  // Text size for all content within cards
  .ant-card-head-title {
    font-size: 20px;
  }
  
  .ant-typography {
    font-size: 14px;
  }
  
  // Style the bullet points
  ul {
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
`;

function App() {
  const [markdown, setMarkdown] = useState(null);
  const [markdownFigure, setMarkdownFigure] = useState(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const [mainRes, figureRes] = await Promise.all([
          axios(`/ABOUT.md`),
          axios(`/ABOUT_figure.md`).catch(() => null)
        ]);
        setMarkdown(mainRes.data);
        setMarkdownFigure(figureRes ? figureRes.data : null);
        setError(false);
      } catch (error) {
        console.log(error);
        setError(true);
      }
    };
    loadAbout();
  }, []);
  
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
  
  return (
    <PageContent>
      {!user && (
        <Alert
          banner
          showIcon
          type="info"
          message={
            <div style={{ width: '100%', textAlign: 'right' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                Use GBIF login to access PhyloNext!
              </span>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 48 }}>
        <Col>
          <Link href="https://biodt.eu" target="_blank">
            <Image
              width={300}
              src="/assets/logo_BioDT.svg"
              preview={false}
            />
          </Link>
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
        {user && (
          <Col>
            <Button type="primary" size="large" onClick={handleStartNewAnalysis}>
              Start New Analysis
            </Button>
          </Col>
        )}
      </Row>

      <StyledCard>
        {error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Text>Failed to load content</Text>
          </div>
        ) : (
          markdown && (
            <>
              <span
                dangerouslySetInnerHTML={{
                  __html: marked(markdown),
                }}
              />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Image
                  src="https://vmikk.github.io/PhyloNext2/images/Comparative_analysis.webp"
                  alt="PhyloNext comparative analysis screenshot"
                  preview={false}
                  style={{ width: '70%' }}
                />
              </div>
              {markdownFigure && (
                <div style={{ marginTop: 16 }}>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: marked(markdownFigure),
                    }}
                  />
                </div>
              )}
            </>
          )
        )}
      </StyledCard>

      <StyledCard title="Resources" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large">
          <Text style={{ fontSize: '16px' }}>
            Publications:
            <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
              <li>
                <Link href="https://riojournal.com/article/124988/" target="_blank">
                  Mikryukov V, Abarenkov K, Jeppesen TS, Schigel D, Frøslev T (2024) Prototype Biodiversity Digital Twin: Phylogenetic Diversity. Research Ideas and Outcomes 10: e124988. DOI:10.3897/rio.10.e124988
                </Link>
              </li>
              <li>
                <Link href="https://bmcecolevol.biomedcentral.com/articles/10.1186/s12862-024-02256-9" target="_blank">
                Mikryukov V, Abarenkov K, Laffan S, Robertson T, McTavish EJ, Jeppesen TS, Waller J, Blissett M, Kõljalg U, Miller JT (2024). PhyloNext: A pipeline for phylogenetic diversity analysis of GBIF-mediated data. BMC Ecology and Evolution, 24(1), 76. DOI:10.1186/s12862-024-02256-9
                </Link>
              </li>
            </ul>
          </Text>
        </Space>
      </StyledCard>

      <StyledCard title="Involved partners" style={{ marginTop: 24 }}>
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
      <StyledCard title="Learn more" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="large">
          <Text style={{ fontSize: '16px' }}>
            User documentation:{" "}
            <Link href="https://vmikk.github.io/PhyloNext2/" target="_blank">
              https://vmikk.github.io/PhyloNext2/
            </Link>
          </Text>
          <Text style={{ fontSize: '16px' }}>
            PhyloNext v2 is part of the BioDT prototype Digital Twins. Learn more at{" "}
            <Link href="https://biodt.eu/use-cases/phylogenetic-diversity" target="_blank">
              https://biodt.eu/use-cases/phylogenetic-diversity
            </Link>
          </Text>
        </Space>
      </StyledCard>
    </PageContent>
  );
}

export default App;