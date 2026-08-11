import { createApp } from 'vue'
import GenomeViewer from './GenomeViewer.vue'

var settings = {
    'type_chromosome': 'ancestral',
    'sorting_chromosome': 'number_genes',
    'colorAccessor' : 'completeness_score',
    'heightAccessor' : 'nr_members',
    //'hide_sorting_button': true,
    'hide_detail_button': true,
    'oma': true,
    'min_genes': 15,
    'oma_api_url': 'https://omabrowser.org',
    'force_extent_numerical': {'nr_members': {'min': 0, 'max': 48}},



}

fetch('/oma_primates.json')
    .then(response => response.json())
    .then(data => {

        const app = createApp(GenomeViewer, { jsonData: data, user_settings : settings})



        const vm = app.mount('#app');

        // Access the root component instance and call methods or update state
                vm.$refs.chromosomeViewer.forEach(chromosome => {
                    if (chromosome && typeof chromosome.render_excerpt === 'function') {
                        chromosome.render_excerpt();
                    }
        });




    });


