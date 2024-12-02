import { createApp } from 'vue'
import GenomeViewer from './GenomeViewer.vue'

var settings = {
    'type_chromosome': 'ancestral',
    'sorting_chromosome': 'size',
    'force_extent_numerical': {'completeness_score': {'min': 0.7, 'max': 1}},
}

fetch('/oma_primates.json')
    .then(response => response.json())
    .then(data => {

        createApp(GenomeViewer, { jsonData: data, user_settings : settings})
            .mount('#app')

    });


