<template>

  <SettingsUI/>

  <ChromosomeViewer v-for="(item,index) in sortedData" :key="item.id" :datum="item" :domain_max="domain_max" :settings="settings" @domainChanged="updateDomain(index, $event)"/>

</template>

<script>
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap'

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
    user_settings: Object
  },
  data() {
    return {
      settings: {
        'type_chromosome': 'extant',
        'sorting_chromosome': 'size',
        'min_genes': 100,
        'svgHeight': 100,
      },
      render_data: this.jsonData
    }
  },
  created() {
    this.configure_settings_user()
    this.prepare_data()
  },
  mounted() {
    // For development purposes, add a global keyup event listener to modify the settings.sorting_chromosome
    window.addEventListener('keyup', this.handleKeyup);
  },
  beforeUnmount() {
    window.removeEventListener('keyup', this.handleKeyup);
  },
  methods: {
    // FACTORY METHODS
    process_extant(datum) {
      // Process the data for extant chromosomes
      datum.size_in_bp =  Math.max(...datum.nodes.map(d => d.end))
      datum.size_in_genes = datum.nodes.length
      datum.domain = null
      datum.unique_id = this.generateUniqueId()
      datum.type = 'extant'

      return datum
    },
    process_ancestral(datum) {

      datum.domain = null
      datum.size_in_bp =  datum['nodes'].length
      datum.size_in_genes = datum['nodes'].length
      datum.unique_id = this.generateUniqueId()
      datum.type = 'ancestral'

      var look_up = {};

      // add neighbors and edges links to the nodes
      datum['nodes'].forEach(function(element) {
        element.neighbors = [];
        element.edges = {};
        look_up[element.id] = element
      });

      // add neighbors and edges links to the nodes
      datum['links'].forEach(function(element) {
        look_up[element.source].neighbors.push(look_up[element.target]);
        look_up[element.source].edges[look_up[element.target]] = element
        look_up[element.target].neighbors.push(look_up[element.source]);
        look_up[element.target].edges[look_up[element.source]] = element
      });

      // Sanity check
      var ends = [];


      Object.values(look_up).forEach(function(element) {

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
        current.end = current.start + 1;

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

      return datum


    },
    prepare_data() {

      const processFunction = this.settings.type_chromosome === 'extant' ? this.process_extant : this.process_ancestral;
      this.render_data = Object.values(this.jsonData)
          .filter(datum => datum.nodes.length > this.settings.min_genes)
          .map(processFunction);

    },

    // UTILS
    generateUniqueId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    // MODEL SETTERS
    updateDomain(index, newDomain) {
      this.sortedData[index].domain = newDomain;
    },

    // MISC
    handleKeyup(event) {
      // modify the settings sorting_chromosome when pressed the key 's'
      if (event.key === 's') {
        this.settings.sorting_chromosome = this.settings.sorting_chromosome === 'size' ? 'number_genes' : 'size'
      }
    },
    configure_settings_user() {
      for(var key in this.user_settings) {
        var value = this.user_settings[key];
        this.settings[key] = value;
      }
    }
  },
  computed: {
    sortedData() {
    // Sort jsonData by some criteria in descending order
    switch (this.settings.sorting_chromosome) {
      case 'size':
        return [...this.render_data].sort((a, b) => (a.size_in_bp > b.size_in_bp) ? -1 : 1);
      case 'number_genes':
        return [...this.render_data].sort((a, b) => (a.size_in_genes > b.size_in_genes) ? -1 : 1);
      default:
        return [...this.render_data].sort((a, b) => a.id - b.id);

    }
  },
    domain_max() {
      switch (this.settings.type) {
        case 'extant':
          return Math.max(...this.sortedData.map(d => d.size_in_bp))
        case 'ancestral':
          return Math.max(...this.sortedData.map(d => d.size_in_genes))
        default:
          return Math.max(...this.sortedData.map(d => d.size_in_bp))

      }
    }
}

}
</script>

<style>
#app {
}
</style>
