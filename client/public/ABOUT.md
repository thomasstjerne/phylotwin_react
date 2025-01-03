# PhyloNext 

PhyloNext is an automated pipeline for the analysis of phylogenetic diversity using [GBIF occurrence data](https://www.gbif.org/occurrence/search?occurrence_status=present), species phylogenies from [Open Tree of Life](https://tree.opentreeoflife.org), and [Biodiverse software](https://shawnlaffan.github.io/biodiverse/).

Please refer to [https://phylonext.github.io/](https://phylonext.github.io/) for detailed documentation.


## Introduction

PhyloNext pipeline brings together two critical research data infrastructures, the Global
Biodiversity Information Facility [(GBIF)](https://www.gbif.org/) and Open Tree of Life [(OToL)](https://tree.opentreeoflife.org), to make them more accessible to non-experts.

The pipeline is built using [Nextflow](https://www.nextflow.io), a workflow tool to run tasks across multiple compute infrastructures in a very portable manner. It uses [Docker](https://www.docker.com/) containers making installation trivial and results highly reproducible. The [Nextflow DSL2](https://www.nextflow.io/docs/latest/dsl2.html) implementation of this pipeline uses one container per process which makes it much easier to maintain and update software dependencies.

The pipeline could be launched in a cloud environment (e.g., the [Microsoft Azure Cloud Computing Services](https://azure.microsoft.com/en-us/), [Amazon AWS Web Services](https://aws.amazon.com/), and [Google Cloud Computing Services](https://cloud.google.com/)).


## Pipeline summary

1. Filtering of GBIF species occurrences for various taxonomic clades and geographic areas
2. Removal of non-terrestrial records and spatial outliers (using density-based clustering)
3. Preparation of phylogenetic tree (using pre-constructed phylogenetic tree provided by user or phylogenetic tree can be downloaded automatically using API) and name-matching with GBIF species keys
4. Spatial binning of species occurrences using Uber’s H3 system (hexagonal hierarchical spatial index)
5. Estimation of phylogenetic diversity and endemism indices using [Biodiverse program](https://shawnlaffan.github.io/biodiverse/)
6. Visualization of the obtained results

## PhyloNext Workflow

