router.get('/job/:jobId/results', async (req, res) => {
  try {
    const { jobId } = req.params;
    const resultsPath = path.join(config.OUTPUT_PATH, jobId, 'output/02.Diversity_estimates/diversity_estimates.geojson');
    
    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({ error: 'Results not found' });
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    res.json(results);
  } catch (error) {
    console.error('Error serving results:', error);
    res.status(500).json({ error: 'Failed to load results' });
  }
}); 