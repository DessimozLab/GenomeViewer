<template>

  <SettingsUI/>

  <ChromosomeViewer v-for="item in sortedData" :key="item.id" :datum="item" />

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
        'type_chromosome': 'ancestral',
        'sorting_chromosome': 'size',
      },
      render_data: this.jsonData
    }
  },
  created() {
    this.configure_settings_user()
    this.prepare_data()
  },
  mounted() {

  },
  methods: {
    process_extant(datum) {
      // Process the data for extant chromosomes
      datum.size_in_bp =  Math.max(...datum.nodes.map(d => d.end))
      datum.size_in_genes = datum.nodes.length

      return datum
    },
    process_ancestral(datum) {

      if (datum['nodes'].length === 1) {
        return datum
      }

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
        previous.edge = previous.edges[current];
      }


    },
    prepare_data() {

      var data = []

      // Prepare the data for rendering
      if (this.settings.type_chromosome === 'extant') {
        for (var key in this.jsonData) {
          data.push(this.process_extant(this.jsonData[key]))
        }
      } else if (this.settings.type_chromosome === 'ancestral') {

        data = this.jsonData


        /*for (var key_ in this.jsonData) {
          console.log(this.jsonData[key_])
          data.push(this.process_ancestral(this.jsonData[key_]))
        }

         */
      } else {

      this.render_data = data
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
    // Sort jsonData by some criteria
    switch (this.settings.sorting_chromosome) {
      case 'size':
        return [...this.render_data].sort((a, b) => (a.size_in_bp > b.size_in_bp) ? -1 : 1);
      case 'number_genes':
        return [...this.render_data].sort((a, b) => (a.size_in_genes > b.size_in_genes) ? -1 : 1);
      default:
        return [...this.render_data].sort((a, b) => a.id - b.id);

    }
  }
}

}
</script>

<style>
#app {
}
</style>
