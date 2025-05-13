# Genome Viewer

## Overview

Genome Viewer is a web application built with Vue.js that visualizes genomic data. It allows users to view and interact with chromosome data.

## Features

- Display genomic data for chromosomes
- Select and apply different color schemes
- Interactive legends for color scales
- Configurable settings for chromosome types and sorting

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/F4llis/GenomeViewer.git
   cd GenomeViewer
   ```

2. Install dependencies using Yarn or npm:
   ```bash
   yarn install
   # or
   npm install
   ```
You can also install it from npm repository:
```bash
npm install genome-viewer
``` 

## Usage

1. Start the development server:
   ```bash
   yarn serve
   # or
   npm run serve
   ```

2. Open your browser and navigate to `http://localhost:8080/demo_human` (or any page you set up in [vue.config.js](vue.config.js) ).

## Configuration

The application can be configured using the `settings` object in `src/main_human.js`. Example settings include:

```javascript
var settings = {
    'type_chromosome': 'extant',
    'sorting_chromosome': 'size',
    'remove_outliers_legend': ['weight'],
};
```
## Dependencies

- Vue.js
- d3-scale-chromatic

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.