import { createApp } from 'vue'
import GenomeViewer from './GenomeViewer.vue'

var settings = {
    'type_chromosome': 'extant',
    'oma': true,
    'oma_api_url': 'https://omabrowser.org',
    'sorting_chromosome': 'size',
        'remove_outliers_legend': ['weight'],
}

fetch('/oma_human.json')
    .then(response => response.json())
    .then(data => {

        createApp(GenomeViewer, { jsonData: data, user_settings : settings})
            .mount('#app')

    });


