<template>

  <SettingsUI
      :settings="settings"
      :statesColorGenes="statesColorGenes"
      @settings-event="handleSettingsEvent"
  />

  <ChromosomeViewer
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

import SettingsUI from './components/Settings.vue'
import ChromosomeViewer from './components/Chromosome.vue'
import * as d3 from 'd3';
//import * as perlin from './perlin.js';

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
        'min_genes': 100,
        'type_position': 'loci',
        'hide': false, // detail view
        'mode': 'zoom',
        'defaut_gene_color': 'lightgrey',

        // DATUM RELATED SETTINGS
        exclusion_list: ['id', 'chromosome', 'start', 'end', 'hog_id' ],
        exclusion_list_edges: ['source', 'target', 'id', 'hog_id', 'evidence'],
        data_metrics: null,

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
      }
    },
    handleSettingsEvent({eventType, payload}) {
      switch (eventType) {
        case 'toggle-type':
          this.toggleType();
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




      }
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

    // FACTORY METHODS
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

      // Fake data for the genes  TODO remove this
      datum.nodes.forEach(gene => { gene.data = {}})
      if (!isNaN(datum.nodes[0]['chromosome']) || ['X', 'Y', 'MT'].includes(datum.nodes[0]['chromosome'])) {
        datum.name = "Chromosome " + datum.nodes[0]['chromosome']
      } else {
        datum.name = datum.nodes[0]['chromosome']
      }

      // get from "links" any data and add it to correcting nodes using targe and source mapped to id
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
    analyzeData() {
      const analysis = {
        numerical: {},
        categorical: {}
      };

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

      console.log(analysis);
      this.settings.data_metrics = analysis;
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
    process_ancestral(datum) {

      datum.domain = null
      datum.currentZoom = d3.zoomIdentity
      datum.selectedRegions = []
      datum.size_in_bp = datum['nodes'].length
      datum.size_in_genes = datum['nodes'].length
      datum.unique_id = this.generateUniqueId()
      datum.type = 'ancestral'
      datum.name = "Ancestral Chromosome"


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
        current.end = current.start + Math.random();


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

      datum.nodes.forEach(gene => {gene.data = {}})

      this.bind_links_to_nodes(datum)

      return datum


    },
    prepare_data() {

      const processFunction = this.settings.type_chromosome === 'extant' ? this.process_extant : this.process_ancestral;

      this.render_data = Object.values(this.jsonData)
          .filter(datum => datum.nodes.length > this.settings.min_genes)
          .map(processFunction);

      this.add_fake_data()

      this.analyzeData()

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
      for (var key in this.user_settings) {
        var value = this.user_settings[key];
        this.settings[key] = value;
      }
    }
  },
  computed: {
    statesColorGenes() {
      return Object.keys(this.settings.data_metrics.numerical) // todo make cat and num
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

