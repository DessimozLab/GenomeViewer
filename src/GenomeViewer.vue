<template>

  <SettingsUI
      ref="settingsUI"
      :settings_base="settings"
      :statesColorGenes="statesColorGenes"
      @settings-event="handleSettingsEvent"
  />

  <ChromosomeViewer
      ref="chromosomeViewer"
      v-for="(item,index) in sortedData"
      :key="item.id"
      :datum="item"
      :domain_max="domain_max"
      :settings="settings"
      @chromosome-event="handleChromosomeEvent(index, $event)"
  />

</template>

<script>
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap'
import * as d3 from 'd3';
import * as d3_chrome from 'd3-scale-chromatic';

import SettingsUI from './components/Settings.vue'
import ChromosomeViewer from './components/Chromosome.vue'

export default {
  name: 'GenomeViewer',
  components: {
    SettingsUI,
    ChromosomeViewer
  },
  props: {
    jsonData: Object,
    user_settings: Object,
  },
  data() {
    return {
      settings: {
        // GENERAL SETTINGS
        'type_chromosome': 'extant',
        'sorting_chromosome': 'size',
        'min_genes': 30, // HUMAN Y chromosome has 47 genes in our dataset
        'type_position': 'loci',
        'hide': false, // detail view
        'mode': 'zoom',
        'defaut_gene_color': 'lightgrey',
        'oma' : false,
        'level': null,
        'callback_click_synteny': null,
        'callback_click_detail': null,
        'callback_click_members': null,

        // COLOR
        color_scheme: 'Viridis',
        color_scheme_list: Object.keys(d3_chrome)
            .filter(key => key.startsWith('interpolate'))
            .reduce((acc, key) => {
              acc[key.replace('interpolate', '')] = d3[key];
              return acc;
            }, {}),
        // DATUM RELATED SETTINGS
        exclusion_list: ['id', 'chromosome', 'start', 'end', 'hog_id', 'index' ],
        exclusion_list_edges: ['source', 'target', 'id', 'hog_id', 'evidence'],
        data_metrics: null,
        force_extent_numerical:{},

        // OVERVIEW SETTINGS
        'svgHeight_overview': 40,
        'colorAccessor_overview': null,
        'heightAccessor_overview': null,
        'brushed_gene_color': 'salmon',

        // MAPPER SETTINGS
        'svgHeight_mapper': 42,

        // EXCERPT SETTINGS
        'svgHeight': 80,
        'colorAccessor_excerpt': null,
        'heightAccessor_excerpt': null,
        'colorAccessor_excerpt_edge': null,
        'selected_gene_color': 'SkyBlue',
        'edge_height': 8,
      },
      index_color_genes_overview: 0,
      index_sorting: 0,
      states_sorting: ['size', 'number_genes', 'name'],
      render_data: this.jsonData
    }
  },
  created() {
    this.configure_settings_user()
    this.prepare_data()
  },
  methods: {

    // UI EVENT HANDLERS
    handleChromosomeEvent(index, {eventType, payload}) {
      switch (eventType) {
        case 'updateZoom':
          this.updateZoom(index, payload)
          break;
        case 'domainChanged':
          this.updateDomain(index, payload)
          break;
        case 'updateDomain':
          this.updateDomain(index, payload)
          break;
        case 'addSelectedRegions':
          this.addSelectedRegions(index, payload)
          break;
        case 'unselect-all':
          this.sortedData[index].selectedRegions = []
          this.$refs.chromosomeViewer[index].render_excerpt();
          this.$refs.chromosomeViewer[index].render_mapper();
          this.$refs.chromosomeViewer[index].render_overview();

          break;
      }
    },
    handleSettingsEvent({eventType, payload}) {
      switch (eventType) {
        case 'toggle-type':
          this.toggleType();
          break;
        case 'export-svg':
          this.exportSVG();
          break;
        case 'toggle-hide':
          this.toggleHide();
          break;
        case 'toggle-sorting':
          this.toggleSorting();
          break;
        case 'toggle-mode':
          this.toggleMode();
          break;
        case 'update-color-overview':
          this.toggleColorOverview(payload);
          break;
        case 'update-height-overview':
          this.toggleHeightOverview(payload);
          break;
        case 'update-color-excerpt':
          this.toggleColorExcerpt(payload);
          break;
        case 'update-height-excerpt':
          this.toggleHeightExcerpt(payload);
          break;
        case 'update-color-excerpt_edge':
          this.toggleColorExcerpt_edge(payload);
          break;
        case 'update-color-scheme':
          this.toggleColorScheme(payload);
          break;




      }
    },
    toggleColorScheme(selectedOption) {
      this.settings.color_scheme = selectedOption;
    },
    toggleColorExcerpt(selectedOption) {
      this.settings.colorAccessor_excerpt = selectedOption;
    },
    toggleColorExcerpt_edge(selectedOption) {
      this.settings.colorAccessor_excerpt_edge = selectedOption;
    },
    toggleHeightExcerpt(selectedOption) {
      this.settings.heightAccessor_excerpt = selectedOption;
    },
    toggleColorOverview(selectedOption) {
      this.settings.colorAccessor_overview = selectedOption;
    },
    toggleHeightOverview(selectedOption) {
      this.settings.heightAccessor_overview = selectedOption;
    },
    toggleMode() {
      this.settings.mode = this.settings.mode === 'zoom' ? 'brush' : 'zoom';
    },
    toggleSorting() {
      this.index_sorting = ++this.index_sorting % this.states_sorting.length;
      this.settings.sorting_chromosome = this.states_sorting[this.index_sorting];
    },
    toggleType() {
      this.settings.type_position = this.settings.type_position === 'loci' ? 'index' : 'loci'
    },
    toggleHide() {
      this.settings.hide = this.settings.hide ? false : true
    },
    combineSVGsWithLegend() {
      const width_name = 200;
      const width_desc = 200;
      const gutter = 20;
      const vgutter = 10;

      const svgElements = this.$refs.chromosomeViewer.map((chromosome,index) => {

        const svgOverview = chromosome.$refs['svg_overview'];

        const combinedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        combinedSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        combinedSVG.setAttribute("width", chromosome.parentWidth + 200 + 3*gutter + width_desc);
        combinedSVG.setAttribute("height", this.settings.svgHeight_overview + 2*vgutter);

        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.setAttribute("y", 3 * vgutter);
        textElement.textContent = chromosome.chromosome_name;

        // Create a temporary SVG to measure the text width
        const tempSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        document.body.appendChild(tempSVG);
        tempSVG.appendChild(textElement);
        const textWidth = textElement.getBBox().width;
        document.body.removeChild(tempSVG);

        // Set the x attribute to align the text to the right end
        textElement.setAttribute("x", width_name - textWidth);
        combinedSVG.appendChild(textElement);

        const clonedSVG = svgOverview.cloneNode(true);
        clonedSVG.setAttribute("x",   width_name + gutter);
        clonedSVG.querySelectorAll('.line_extent_overview').forEach(line => {
          line.style.display = 'none';
        });
        combinedSVG.appendChild(clonedSVG);

        const textElement2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement2.setAttribute("y", 3 * vgutter);
        textElement2.textContent = chromosome.chromosome_genes_desc;
        textElement2.setAttribute("x", width_name + 2*gutter + svgOverview.width.animVal.value);
        combinedSVG.appendChild(textElement2);


        var offset_legend = 0.5
        if (this.settings.colorAccessor_overview){ offset_legend += 1 }
        if (this.settings.heightAccessor_overview){ offset_legend += 1.5 }

        combinedSVG.setAttribute("y", (offset_legend + index) * (this.settings.svgHeight_overview + gutter));

        return combinedSVG;
      });

      const finalSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      finalSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      finalSVG.setAttribute("width", this.$refs.chromosomeViewer[0].parentWidth + width_name + 3*gutter + width_desc);
      finalSVG.setAttribute("height", (svgElements.length+3) * (this.settings.svgHeight_overview + 2*vgutter));

      // Add legend if present
      if (this.settings.colorAccessor_overview){

        const settingsUI = this.$refs.settingsUI;
        const colorLegend = settingsUI.$refs.colorLegendOverview;
        const legend = colorLegend.$refs.legend;

        const legendSVG = legend.cloneNode(true);
        legendSVG.setAttribute("x", width_name + gutter);
        legendSVG.setAttribute("y",  gutter);
        finalSVG.appendChild(legendSVG);

        // min extent
        const textLegend = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textLegend.setAttribute("y", gutter + 40);
        textLegend.textContent = colorLegend.min_base;
        textLegend.setAttribute("x", width_name);
        textLegend.setAttribute("text-anchor", "end");
        textLegend.setAttribute("font-size", "smaller");
        finalSVG.appendChild(textLegend);

        // max extent
        const textLegend2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textLegend2.setAttribute("y", gutter + 40);
        textLegend2.textContent = colorLegend.max_base;
        textLegend.setAttribute("font-size", "smaller");
        textLegend2.setAttribute("x", width_name + gutter + legend.width.animVal.value);
        finalSVG.appendChild(textLegend2);

      }

      if (this.settings.heightAccessor_overview){

        var offset_legend = this.settings.colorAccessor_overview ? 2*gutter + 20 : 0

        const settingsUI = this.$refs.settingsUI;
        const heightLegend = settingsUI.$refs.heightLegendOverview;
        const legend = heightLegend.$refs.legend;

        const legendSVG = legend.cloneNode(true);
        legendSVG.setAttribute("x", width_name + gutter);
        legendSVG.setAttribute("y",  offset_legend + gutter);
        finalSVG.appendChild(legendSVG);

      }


      svgElements.forEach((svg) => {
            finalSVG.appendChild(svg)
      }


      );

      return finalSVG;
    },
    exportSVG() {
        const combinedSVG = this.combineSVGsWithLegend();
        const serializer = new XMLSerializer();
        const svgBlob = new Blob([serializer.serializeToString(combinedSVG)], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "chromosome_viewer_" + this.chromosome_name + ".svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // FACTORY METHODS
    prepare_data() {

      const processFunction = this.settings.type_chromosome === 'extant' ? this.process_extant : this.process_ancestral;

      this.render_data = Object.values(this.jsonData)
          .filter(datum => datum.nodes.length > this.settings.min_genes)
          .sort((a, b) => a.nodes.length + b.nodes.length)
          .map((element, index) => processFunction(element, index));

      //this.add_fake_data()

      this.analyzeData()

    },
    process_extant(datum) {

      // Process the data for extant chromosomes
      datum.size_in_bp = Math.max(...datum.nodes.map(d => d.end))
      datum.size_in_genes = datum.nodes.length
      datum.domain = null
      datum.selectedRegions = []
      datum.currentZoom = d3.zoomIdentity
      datum.unique_id = this.generateUniqueId()
      datum.type = 'extant'

      // Add index to the nodes based on start asc sorting
      datum.nodes = datum.nodes.sort((a, b) => a.start - b.start).map((d, i) => {
        d.index = i
        return d
      })

      datum.nodes = this.get_data_metrics(datum.nodes)

      if (!isNaN(datum.nodes[0]['chromosome']) || ['X', 'Y', 'MT'].includes(datum.nodes[0]['chromosome'])) {
        datum.name = "Chromosome " + datum.nodes[0]['chromosome']
      } else {
        datum.name = datum.nodes[0]['chromosome']
      }

      // get from "links" any data and add it to correcting nodes using targe and source mapped to id
      this.bind_links_to_nodes(datum)

      return datum
    },
    get_data_metrics(nodes){

      const potentialTypes = {};

      // Step 1: Determine potential types for each key
      nodes.forEach(gene => {
        Object.entries(gene).forEach(([key, value]) => {
          if (this.settings.exclusion_list.includes(key)) {
            return;
          }

          if (!potentialTypes[key]) {
            potentialTypes[key] = 'number';
          }

          if (typeof value === 'string') {
            potentialTypes[key] = 'string';
          }
        });
      });

      // Step 2: Add values to data with the determined type
      nodes.forEach(gene => {
        gene.data = {};

        Object.entries(gene).forEach(([key, value]) => {
          if (this.settings.exclusion_list.includes(key)) {
            return;
          }

          if (potentialTypes[key] === 'number' && typeof value === 'number') {
            gene.data[key] = value;
          } else if (potentialTypes[key] === 'string') {
            gene.data[key] = value.toString();
          }
        });
      });

      return nodes

    },
    process_ancestral(datum, idx) {

      datum.domain = null
      datum.currentZoom = d3.zoomIdentity
      datum.selectedRegions = []
      datum.size_in_bp = datum['nodes'].length
      datum.size_in_genes = datum['nodes'].length
      datum.unique_id = this.generateUniqueId()
      datum.type = 'ancestral'
      datum.name = "Ancestral Chromosome " + (1 + idx)


      var look_up = {};

      // add neighbors and edges links to the nodes
      datum['nodes'].forEach(function (element) {
        element.neighbors = [];
        element.edges = {};
        look_up[element.id] = element
      });

      // add neighbors and edges links to the nodes
      datum['links'].forEach(function (element) {
        look_up[element.source].neighbors.push(look_up[element.target]);
        look_up[element.source].edges[look_up[element.target]] = element
        look_up[element.target].neighbors.push(look_up[element.source]);
        look_up[element.target].edges[look_up[element.source]] = element
      });

      // Sanity check
      var ends = [];


      Object.values(look_up).forEach(function (element) {

        switch (Object.keys(element.neighbors).length) {
          case 0:
            throw "No neighbor in this hog";
          case 1:
            ends.push(element);
            if (ends.length > 2) {
              throw "More than 2 ends in the contigs";
            }
            break;
          case 2:
            break;
          default:
            throw "More than 2 neighboring hogs"
        }

      });

      if (ends.length !== 2) {
        throw "Contigs dont have 2 ends."
      }

      // Flatten contig
      var previous = null
      var current = ends.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()))[0];
      var processing = true


      while (processing) {
        current.start = previous === null ? 0 : previous.end + 1;
        current.index = previous === null ? 0 : previous.index + 1;
        current.end = current.start + 0.5;


        if (previous != null && current.neighbors.length === 1) {
          previous = current;
          current = current.neighbors[0];
          processing = false;
        } else {
          let tmp = current
          current = current.neighbors[0] === previous ? current.neighbors[1] : current.neighbors[0];
          previous = tmp;
        }

        previous.edge = previous.edges[current];
      }


      // Add index to the nodes based on start asc sorting
      datum.nodes = datum.nodes.sort((a, b) => a.start - b.start).map((d, i) => {
        d.index = i
        return d
      })

      datum.nodes = this.get_data_metrics(datum.nodes)


      this.bind_links_to_nodes(datum)

      return datum


    },
    bind_links_to_nodes(datum) {

      var look_up = {};

      // add neighbors and edges links to the nodes
      datum['nodes'].forEach( (element) => {
        look_up[element.id] = element
      });

      // add neighbors and edges links to the nodes
      datum['links'].forEach((element) => {

        var s = look_up[element.source];
        var t = look_up[element.target];

        var left_gene = s.index < t.index ? s : t;
        left_gene.edges = element

        Object.entries(element).forEach( ([key, value]) => {

          // if key in exclusion list, skip
          if (this.settings.exclusion_list_edges.includes(key)) {
            return;
          }
          left_gene.data[key] = value
        })

      });

    },
    add_fake_data() {

      function generateRandomString(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
      }
      function chooseRandom() {
        return Math.random() < 0.5 ? 'cat' : 'num';
      }
      function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      function getRandomElement(arr) {
        const randomIndex = Math.floor(Math.random() * arr.length);
        return arr[randomIndex];
      }
      function randomCategories() {
        return Array.from({length: getRandomInt(5, 20)}, () => generateRandomString(5));
      }
      function randomOffset() {
        return getRandomInt(-10000000000, 10000000000)
      }


      // generate 5 combination of type and name in array
      const combinations = Array.from({length: 5}, () => [chooseRandom(), generateRandomString(5), randomCategories(),randomOffset() ])

      this.render_data.forEach(datum => {
      datum.nodes.forEach(gene => {
        combinations.forEach(([type, name, categories, off_set_simplex ]) => {
          gene.data[name] = (type === 'cat') ? getRandomElement(categories) : getRandomInt(0, off_set_simplex)
        })
      })

      })

    },
    analyzeData() {
      const analysis = {
        numerical: {},
        categorical: {}
      };

      // scan all the data and get the min and max for numerical data and unique values for categorical data
      this.render_data.forEach(datum => {
        datum.nodes.forEach(node => {

          Object.entries(node.data).forEach(([key, value]) => {
            // if key in exclusion list, skip
            if (this.settings.exclusion_list.includes(key)) {
              return;
            }
            if (typeof value === 'number') {
              if (!analysis.numerical[key]) {
                analysis.numerical[key] = { min: value, max: value };
              } else {
                analysis.numerical[key].min = Math.min(analysis.numerical[key].min, value);
                analysis.numerical[key].max = Math.max(analysis.numerical[key].max, value);
              }
            } else if (typeof value === 'string') {
              if (!analysis.categorical[key]) {
                analysis.categorical[key] = new Set();
              }
              analysis.categorical[key].add(value);
            }
          });
        });
      });

      // Convert sets to arrays for categorical data
      Object.keys(analysis.categorical).forEach(key => {
        analysis.categorical[key] = Array.from(analysis.categorical[key]);
      });

      // Force the extent of numerical data if specify in the settings

      if (this.settings.force_extent_numerical)
      {
        Object.entries(this.settings.force_extent_numerical).forEach(([key, value]) => {
          if (analysis.numerical[key]) {
            analysis.numerical[key].min = value.min;
            analysis.numerical[key].max = value.max;
          }
        });
      }

      this.settings.data_metrics = analysis;

    },

    // UTILS
    generateUniqueId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // MODEL SETTERS
    updateDomain(index, newDomain) {
      this.sortedData[index].domain = newDomain;
    },
    updateZoom(index, newzoom) {
      this.sortedData[index].currentZoom = newzoom;
    },
    addSelectedRegions(index, newSelectedRegions) {
      this.sortedData[index].selectedRegions.push(newSelectedRegions);
    },

    // MISC
    handleKeyup(event) {

      // modify the settings type_position when pressed the key 't'
      if (event.key === 't') {
        this.settings.type_position = this.settings.type_position === 'loci' ? 'index' : 'loci'
      }
    },
    configure_settings_user() {

      // merge the user settings with the default settings
      for (var key in this.user_settings) {
        var value = this.user_settings[key];
        this.settings[key] = value;
      }

      // force the type_position to index if the type_chromosome is ancestral
      if (this.settings.type_chromosome === 'ancestral') {
        this.settings.type_position = 'index';
      }
    }
  },
  computed: {
    statesColorGenes() {
      return Object.keys(this.settings.data_metrics.numerical) // TODO make cat and num system
    },
    sortedData() {
      // Sort jsonData by some criteria in descending order
      switch (this.settings.sorting_chromosome) {
        case 'size':
          return [...this.render_data].sort((a, b) => (a.size_in_bp > b.size_in_bp) ? -1 : 1);
        case 'number_genes':
          return [...this.render_data].sort((a, b) => (a.size_in_genes > b.size_in_genes) ? -1 : 1);
        case 'name':
          return [...this.render_data].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
        default:
          return [...this.render_data].sort((a, b) => a.id - b.id);

      }
    },
    domain_max() {
      const acc = this.settings.type_position === 'index' ? 'size_in_genes' : 'size_in_bp'
      return Math.max(...this.sortedData.map(d => d[acc]))
    }
  }

}
</script>

