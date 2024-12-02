import { createApp } from 'vue'
import GenomeViewer from './GenomeViewer.vue'

var settings = {
    'type_chromosome': 'extant',
    'sorting_chromosome': 'size',
    'force_extent_numerical': {'weight': {'min': 0, 'max': 50}},
}

fetch('/oma_human.json')
    .then(response => response.json())
    .then(data => {

        createApp(GenomeViewer, { jsonData: data, user_settings : settings})
            .mount('#app')

    });


