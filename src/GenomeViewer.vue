<template>

  <SettingsUI
      ref="settingsUI"
      :settings_base="settings"
      :statesColorGenes="statesColorGenes"
      :exampleSearchId="exampleSearchId"
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

const SVG_NS = "http://www.w3.org/2000/svg";

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
        'hide_detail_button': false, // hides the "Detail" toolbar button (config-only, for embedding apps)
        'hide_sorting_button': false, // hides the "Sort by" toolbar button (config-only, for embedding apps)
        'mode': 'zoom',
        'defaut_gene_color': 'lightgrey',
        'oma' : false,
        'oma_api_url': '',
        'level': null,
        'callback_click_synteny': null,
        'callback_click_detail': null,
        'callback_click_members': null,

        'searchQueries': [],
        'searchQueriesIds': [],

        // COLOR (per-channel: Gene color and Edge color each keep their own scheme)
        color_scheme: 'Viridis',
        color_scheme_edge: 'Viridis',
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
        remove_outliers_legend: [], // this will override the force_extent_numerical
        // per-metric display label/unit, keyed by the exact field name as it appears on the node's
        // `data` bag (so edge-derived keys like 'age_edge' are configured independently of any
        // gene-level 'age'). Both label and unit are optional; falls back to the raw key name and no unit.
        metric_meta: {
          age_edge: {label: 'Age of adjacency', unit: 'mya'},
          weight_edge: {label: "Nbr of extant gene pairs supporting the adjacency"},
          completeness_score: {label: 'Completeness score of HOG'},
          nr_members: {label: "Nbr of extant genes in HOG"},
        },

        // GENE ACCESSORS (shared between the overview bar and the excerpt view)
        'colorAccessor': null,
        'heightAccessor': null,
        'colorAccessor_edge': null,

        // OVERVIEW SETTINGS
        'svgHeight_overview': 40,
        'brushed_gene_color': 'salmon',

        // MAPPER SETTINGS
        'svgHeight_mapper': 42,

        // EXCERPT SETTINGS
        'svgHeight': 80,
        'default_excerpt_window_genes': 25,
        'selected_gene_color': 'SkyBlue',
        'edge_height': 8,
      },
      index_color_genes_overview: 0,
      index_sorting: 0,
      states_sorting: ['size', 'number_genes', 'name'],
      render_data: this.jsonData,

    }
  },
  created() {
    this.configure_settings_user()
    this.prepare_data()

    // Check if URL contains query parameter and perform search_query
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('query');
    if (queryId) {
      this.$nextTick(() => {
        this.search_query(queryId);
      });
    }
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
        case 'download-svg':
          this.downloadChromosomeSVG(index);
          break;
        case 'download-png':
          this.downloadChromosomePNG(index);
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
        case 'update-color':
          this.toggleColor(payload);
          break;
        case 'update-height':
          this.toggleHeight(payload);
          break;
        case 'update-color-edge':
          this.toggleColorEdge(payload);
          break;
        case 'search':
          this.search_query(payload);
          break;

      }
    },
    scrollToRect(queryId) {
      const rect = document.getElementById(queryId);
      if (rect) {
        this.settings.searchQueries.push(rect);
        this.settings.searchQueriesIds.push(queryId);
        rect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // add class to highlight the element
        rect.classList.add('highlight');
        rect.setAttribute('stroke', 'red');
        rect.setAttribute('stroke-width', '2px');
        console.log(this.settings.searchQueries, rect)
      } else {
        alert(`Element with ID ${queryId} not found.`);
        console.log(`Element with ID ${queryId} not found.`);
      }
    },
    search_query(queryId) {
      this.scrollToRect(queryId);

      const index = this.sortedData.findIndex(datum => datum.nodes.some(node => node.id === queryId));
      if (index === -1) {
        return;
      }

      const chromosomeRef = this.$refs.chromosomeViewer[index];
      if (chromosomeRef) {
        chromosomeRef.centerOnGeneId(queryId);
      }
    },
    toggleColor(selectedOption) {
      this.settings.colorAccessor = selectedOption;
    },
    toggleColorEdge(selectedOption) {
      this.settings.colorAccessor_edge = selectedOption;
    },
    toggleHeight(selectedOption) {
      this.settings.heightAccessor = selectedOption;
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
    // The overview bar's gene-height scale (`settings.svgHeight_overview`) is intentionally much
    // shorter on-screen than the excerpt's (`settings.svgHeight`), which is also what the height
    // legend is built at - so a straight clone of the overview would render its bars at half the
    // height a same-value bar gets in the legend/excerpt. Re-scaling the clone's vertical axis by
    // that same ratio (a single non-uniform <g transform="scale(1,r)">, which scales both rect
    // heights and their translate() offsets together) makes it read at the same visual scale
    // without touching the live on-screen overview rendering. Only relevant when a height metric
    // (and therefore a height legend to match) is actually active - otherwise bars are uniform and
    // there's nothing to keep in scale, so leave the overview at its native export size.
    overviewExportScale() {
      return this.settings.heightAccessor ? this.settings.svgHeight / this.settings.svgHeight_overview : 1;
    },
    scaleOverviewForExport(svgOverviewEl) {
      const scale = this.overviewExportScale();
      const clone = svgOverviewEl.cloneNode(true);
      const originalHeight = parseFloat(svgOverviewEl.getAttribute("height")) || this.settings.svgHeight_overview;
      clone.setAttribute("height", originalHeight * scale);

      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("transform", `scale(1, ${scale})`);
      while (clone.firstChild) {
        group.appendChild(clone.firstChild);
      }
      clone.appendChild(group);

      return clone;
    },
    // Attaches `textElement` to a throwaway <svg> just long enough to measure its rendered width
    // (getBBox needs layout, which only happens once attached to the document), then hands the same
    // node back detached and ready to be placed in the real export SVG.
    measureSVGTextWidth(textElement) {
      const tempSVG = document.createElementNS(SVG_NS, "svg");
      document.body.appendChild(tempSVG);
      tempSVG.appendChild(textElement);
      const width = textElement.getBBox().width;
      document.body.removeChild(tempSVG);
      return width;
    },
    makeSVGText(content, {x = 0, y = 0, anchor = 'start', size = 'smaller', weight = null, fill = null} = {}) {
      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", x);
      text.setAttribute("y", y);
      text.setAttribute("text-anchor", anchor);
      text.setAttribute("font-size", size);
      if (weight) {
        text.setAttribute("font-weight", weight);
      }
      if (fill) {
        text.setAttribute("fill", fill);
      }
      text.textContent = content;
      return text;
    },
    // The violin's drag handles/lines/labels are styled via scoped CSS classes (see ViolinRange.vue)
    // that only exist in the live app's stylesheet, so a bare clone would lose them once detached
    // into a standalone export SVG. Re-apply the same look as inline attributes, and drop the drag
    // handles themselves since they're an interaction affordance with nothing to show in a static
    // export. Returns null when the violin toggle is off or there's no domain to draw.
    buildViolinGroup(rowInstance) {
      const violinEl = rowInstance.violinEl();
      if (!violinEl) {
        return null;
      }

      const clone = violinEl.cloneNode(true);
      clone.querySelectorAll('.handle-grip').forEach(el => el.remove());
      clone.querySelectorAll('.handle-line').forEach(el => {
        el.setAttribute('stroke', 'rgb(99, 99, 102)');
        el.setAttribute('stroke-width', '1');
        el.setAttribute('stroke-dasharray', '2 2');
      });
      clone.querySelectorAll('.handle-label').forEach(el => {
        el.setAttribute('font-size', '10');
        el.setAttribute('fill', 'rgb(99, 99, 102)');
      });

      return {node: clone, width: parseFloat(clone.getAttribute("width")), height: parseFloat(clone.getAttribute("height"))};
    },
    // One legend column: a bold row title ("Gene color"/"Edge color"), the metric's display name,
    // an optional violin, the color gradient bar, and 5 evenly-spaced tick labels (min/25/50/75/max)
    // underneath - mirroring RangeBar.vue's own on-screen ticks, which are plain positioned HTML and
    // so can't just be cloned into an SVG export. Returns null when this channel has no metric picked.
    buildColorLegendColumn(rowInstance, label) {
      if (!rowInstance || !rowInstance.localAccessor || !rowInstance.extent) {
        return null;
      }
      const track = rowInstance.trackEl();
      if (!track) {
        return null;
      }

      const extent = rowInstance.extent;
      const barWidth = track.width.animVal.value;
      const gutter = 6;

      const column = document.createElementNS(SVG_NS, "g");
      let y = 0;
      let width = barWidth;

      const titleText = this.makeSVGText(label, {y: 10, weight: '600', fill: 'rgb(99, 99, 102)'});
      width = Math.max(width, this.measureSVGTextWidth(titleText));
      column.appendChild(titleText);
      y += 10 + gutter;

      const metricText = this.makeSVGText(rowInstance.buttonText, {y: y + 12, size: '13', weight: '600'});
      width = Math.max(width, this.measureSVGTextWidth(metricText));
      column.appendChild(metricText);
      y += 12 + gutter;

      const violin = this.buildViolinGroup(rowInstance);
      if (violin) {
        violin.node.setAttribute("transform", `translate(0, ${y})`);
        column.appendChild(violin.node);
        width = Math.max(width, violin.width);
        y += violin.height + gutter;
      }

      const barGroup = document.createElementNS(SVG_NS, "g");
      barGroup.setAttribute("transform", `translate(0, ${y})`);
      barGroup.appendChild(track.cloneNode(true));
      column.appendChild(barGroup);
      y += track.height.animVal.value;

      const format = d3.format(",.4~g");
      const anchors = ['start', 'middle', 'middle', 'middle', 'end'];
      [0, 0.25, 0.5, 0.75, 1].forEach((fraction, i) => {
        const value = extent.min + fraction * (extent.max - extent.min);
        column.appendChild(this.makeSVGText(format(value), {x: fraction * barWidth, y: y + 14, anchor: anchors[i]}));
      });
      y += 14 + gutter;

      return {node: column, width, height: y};
    },
    // "Gene height" column: title, metric name, optional violin, then the height-ramp clone - which
    // (unlike the color bar) already carries its own per-sample value labels, so no extra ticks
    // needed here.
    buildHeightLegendColumn(rowInstance, label) {
      if (!rowInstance || !rowInstance.localAccessor || !rowInstance.extent) {
        return null;
      }
      const ramp = rowInstance.trackEl();
      if (!ramp) {
        return null;
      }

      const gutter = 6;
      const column = document.createElementNS(SVG_NS, "g");
      let y = 0;
      let width = parseFloat(ramp.getAttribute("width"));

      const titleText = this.makeSVGText(label, {y: 10, weight: '600', fill: 'rgb(99, 99, 102)'});
      width = Math.max(width, this.measureSVGTextWidth(titleText));
      column.appendChild(titleText);
      y += 10 + gutter;

      const metricText = this.makeSVGText(rowInstance.buttonText, {y: y + 12, size: '13', weight: '600'});
      width = Math.max(width, this.measureSVGTextWidth(metricText));
      column.appendChild(metricText);
      y += 12 + gutter;

      const violin = this.buildViolinGroup(rowInstance);
      if (violin) {
        violin.node.setAttribute("transform", `translate(0, ${y})`);
        column.appendChild(violin.node);
        width = Math.max(width, violin.width);
        y += violin.height + gutter;
      }

      const rampGroup = document.createElementNS(SVG_NS, "g");
      rampGroup.setAttribute("transform", `translate(0, ${y})`);
      rampGroup.appendChild(ramp.cloneNode(true));
      column.appendChild(rampGroup);
      y += parseFloat(ramp.getAttribute("height"));

      return {node: column, width, height: y};
    },
    // Lays out whichever of Gene color / Edge color / Gene height are active side by side, left to
    // right, as one <g> the caller can translate as a unit. { node: null, width: 0, height: 0 } when
    // none of the three channels is in use.
    buildLegendGroup() {
      const gutter = 32;
      const refs = this.$refs.settingsUI.$refs;

      const columns = [
        this.buildColorLegendColumn(refs.legendColorRow, refs.legendColorRow ? refs.legendColorRow.label : 'Gene color'),
        this.buildColorLegendColumn(refs.legendColorRowEdge, refs.legendColorRowEdge ? refs.legendColorRowEdge.label : 'Edge color'),
        this.buildHeightLegendColumn(refs.legendHeightRow, 'Gene height'),
      ].filter(Boolean);

      if (!columns.length) {
        return {node: null, width: 0, height: 0};
      }

      const group = document.createElementNS(SVG_NS, "g");
      let x = 0;
      let height = 0;
      columns.forEach(column => {
        column.node.setAttribute("transform", `translate(${x}, 0)`);
        group.appendChild(column.node);
        x += column.width + gutter;
        height = Math.max(height, column.height);
      });

      return {node: group, width: x - gutter, height};
    },
    triggerSVGDownload(svgElement, filename) {
      const serializer = new XMLSerializer();
      const svgBlob = new Blob([serializer.serializeToString(svgElement)], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    triggerPNGDownload(svgElement, filename) {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = new Image();

      canvas.width = svgElement.getAttribute("width");
      canvas.height = svgElement.getAttribute("height");

      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      img.onload = () => {
        context.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, "image/png");
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    },
    combineSVGsWithLegend() {
      const width_name = 200;
      const width_desc = 200;
      const gutter = 20;
      const vgutter = 10;
      const rowHeight = this.settings.svgHeight_overview * this.overviewExportScale() + 2 * vgutter;

      const legend = this.buildLegendGroup();
      const legendBlockHeight = legend.node ? legend.height + 2 * gutter : gutter;

      const svgElements = this.$refs.chromosomeViewer.map((chromosome,index) => {

        const svgOverview = chromosome.$refs['svg_overview'];

        const combinedSVG = document.createElementNS(SVG_NS, "svg");
        combinedSVG.setAttribute("xmlns", SVG_NS);
        combinedSVG.setAttribute("width", chromosome.parentWidth + 200 + 3*gutter + width_desc);
        combinedSVG.setAttribute("height", rowHeight);

        const textElement = document.createElementNS(SVG_NS, "text");
        textElement.textContent = chromosome.chromosome_name;
        const textWidth = this.measureSVGTextWidth(textElement);

        // Set the x/y attributes to align the text to the right end
        textElement.setAttribute("y", 3 * vgutter);
        textElement.setAttribute("x", width_name - textWidth);
        combinedSVG.appendChild(textElement);

        const clonedSVG = this.scaleOverviewForExport(svgOverview);
        clonedSVG.setAttribute("x",   width_name + gutter);
        clonedSVG.querySelectorAll('.line_extent_overview').forEach(line => {
          line.style.display = 'none';
        });
        combinedSVG.appendChild(clonedSVG);

        const textElement2 = document.createElementNS(SVG_NS, "text");
        textElement2.setAttribute("y", 3 * vgutter);
        textElement2.textContent = chromosome.chromosome_genes_desc;
        textElement2.setAttribute("x", width_name + 2*gutter + svgOverview.width.animVal.value);
        combinedSVG.appendChild(textElement2);

        combinedSVG.setAttribute("y", legendBlockHeight + index * rowHeight);

        return combinedSVG;
      });

      const finalSVG = document.createElementNS(SVG_NS, "svg");
      finalSVG.setAttribute("xmlns", SVG_NS);

      const rowWidth = this.$refs.chromosomeViewer[0].parentWidth + width_name + 3*gutter + width_desc;
      const legendWidth = legend.node ? width_name + gutter + legend.width : 0;
      finalSVG.setAttribute("width", Math.max(rowWidth, legendWidth));
      finalSVG.setAttribute("height", legendBlockHeight + svgElements.length * rowHeight);

      if (legend.node) {
        legend.node.setAttribute("transform", `translate(${width_name + gutter}, ${gutter})`);
        finalSVG.appendChild(legend.node);
      }

      svgElements.forEach((svg) => {
            finalSVG.appendChild(svg)
      }


      );

      return finalSVG;
    },
    exportSVG() {
        const combinedSVG = this.combineSVGsWithLegend();
        this.triggerSVGDownload(combinedSVG, "genome_viewer.svg");
    },
    combineChromosomeSVGWithLegend(index) {
      const chromosome = this.$refs.chromosomeViewer[index];
      const padding = 10;
      const gutter = 20;

      const panelElements = [
        this.scaleOverviewForExport(chromosome.$refs.svg_overview),
        chromosome.$refs.svg_mapper.cloneNode(true),
        chromosome.$refs.svg_excerpt.cloneNode(true),
      ];

      const legend = this.buildLegendGroup();

      const contentWidth = Math.max(chromosome.parentWidth, legend.width);
      const panelsHeight = panelElements.reduce((sum, el) => sum + parseFloat(el.getAttribute("height")), 0);
      const legendBlockHeight = legend.node ? legend.height + gutter : 0;

      const combinedSVG = document.createElementNS(SVG_NS, "svg");
      combinedSVG.setAttribute("xmlns", SVG_NS);
      combinedSVG.setAttribute("width", contentWidth + padding * 2);
      combinedSVG.setAttribute("height", panelsHeight + legendBlockHeight + padding * 2);

      let yOffset = padding;
      panelElements.forEach(el => {
        el.setAttribute("x", padding);
        el.setAttribute("y", yOffset);
        combinedSVG.appendChild(el);
        yOffset += parseFloat(el.getAttribute("height"));
      });

      if (legend.node) {
        legend.node.setAttribute("transform", `translate(${padding}, ${yOffset + gutter})`);
        combinedSVG.appendChild(legend.node);
      }

      return combinedSVG;
    },
    downloadChromosomeSVG(index) {
      const chromosome = this.$refs.chromosomeViewer[index];
      const combinedSVG = this.combineChromosomeSVGWithLegend(index);
      this.triggerSVGDownload(combinedSVG, "chromosome_viewer_" + chromosome.chromosome_name + ".svg");
    },
    downloadChromosomePNG(index) {
      const chromosome = this.$refs.chromosomeViewer[index];
      const combinedSVG = this.combineChromosomeSVGWithLegend(index);
      this.triggerPNGDownload(combinedSVG, "chromosome_viewer_" + chromosome.chromosome_name + ".png");
    },

    // FACTORY METHODS
    prepare_data() {

      const processFunction = this.settings.type_chromosome === 'extant' ? this.process_extant : this.process_ancestral;

      this.render_data = Object.values(this.jsonData)
          .filter(datum => datum.nodes.length >= this.settings.min_genes)
          .sort((a, b) => a.nodes.length + b.nodes.length)
          .map((element, index) => processFunction(element, index))
          .map(datum => this.infer_strand(datum));

      //this.add_fake_data()

      this.analyzeData()

    },
    infer_strand(datum) {

      // Extant genes already carry a real 'strand' field (see process_extant -> get_data_metrics),
      // so there is nothing to infer for them - only ancestral HOGs need a derived direction.
      const nodes = datum.nodes
      if (nodes.length === 0 || nodes[0].data.strand !== undefined) {
        return datum
      }

      const DEFAULT_STRAND = '+' // used only when a whole contig has no divergent/convergent edge to anchor on

      // Walk the contig left to right. A 'divergent'/'convergent' edge fixes the strand of BOTH
      // genes it connects (per the definition below), so it re-anchors `current` outright; a
      // 'unidirectional' edge just means "same strand as the gene to its left", so `current`
      // propagates unchanged. Any leading run of genes seen before the first anchoring edge is
      // filled in retroactively once that anchor is found.
      let current = null

      for (let i = 0; i < nodes.length; i++) {

        if (current !== null) {
          nodes[i].data.strand = current
        }

        if (i === nodes.length - 1) {
          break
        }

        const orientation = nodes[i].data.orientation_edge

        if (orientation !== 'divergent' && orientation !== 'convergent') {
          continue // unidirectional (or missing orientation data): keep propagating `current`
        }

        // divergent: left gene is '-', right gene is '+'. convergent: the opposite.
        const leftStrand = orientation === 'divergent' ? '-' : '+'
        const rightStrand = orientation === 'divergent' ? '+' : '-'

        if (current === null) {
          for (let j = 0; j <= i; j++) {
            nodes[j].data.strand = leftStrand
          }
        } else if (current !== leftStrand) {
          console.warn(`[GenomeViewer] inconsistent edge orientation in "${datum.name}" around gene "${nodes[i].id}": ` +
              `propagated strand '${current}' conflicts with the '${orientation}' edge here; keeping '${current}'.`)
        }

        current = rightStrand
      }

      if (current === null) {
        // no divergent/convergent edge anywhere in this contig: direction is unrecoverable, pick a
        // deterministic default so the whole (unidirectional) contig at least renders consistently
        nodes.forEach(n => { n.data.strand = DEFAULT_STRAND })
      }

      return datum
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

      // Step 2: Add values to data with the determined type, keys alphabetically sorted
      nodes.forEach(gene => {
        gene.data = {};

        Object.keys(gene).sort((a, b) => a.localeCompare(b)).forEach(key => {
          const value = gene[key];

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
      datum.name = "Ancestral Contig " + (1 + idx)


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

        // keys alphabetically sorted, appended after the node's own keys so
        // gene.data stays grouped: node fields first, edge fields last
        Object.keys(element).sort((a, b) => a.localeCompare(b)).forEach((key) => {
          const value = element[key]

          // if key in exclusion list, skip
          if (this.settings.exclusion_list_edges.includes(key)) {
            return;
          }
          var handle_name = key + '_edge'
          left_gene.data[handle_name] = value
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

      var data_tmp = {};

      // scan all the data and get the min and max for numerical data and unique values for categorical data
      this.render_data.forEach(datum => {
        datum.nodes.forEach(node => {

          Object.entries(node.data).forEach(([key, value]) => {
            // if key in exclusion list, skip
            if (this.settings.exclusion_list.includes(key)) {
              return;
            }
            if (typeof value === 'number') {

              // create the key binding in dict if empty
              if (!analysis.numerical[key]) {
                analysis.numerical[key] = { min: value, max: value };
                data_tmp[key] = [];
              } else {
                analysis.numerical[key].min = Math.min(analysis.numerical[key].min, value);
                analysis.numerical[key].max = Math.max(analysis.numerical[key].max, value);
              }

              // keep every value so quartiles (and, for listed keys, outlier trimming) can be
              // computed below from the true distribution, not just the running min/max
              data_tmp[key].push(value)

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

      // Density curve (for the legend's violin plot) - always computed from the true, untrimmed
      // distribution and over its own fixed domain, so a later min/max override just changes which
      // slice of the curve is visible (truncating it) rather than needing to be recomputed.
      Object.keys(analysis.numerical).forEach(key => {
        analysis.numerical[key].density = this.computeDensity(data_tmp[key]);
      });

      // Force the extent of numerical data if specify in the settings

      Object.keys(analysis.numerical).forEach(key => {

        if (this.settings.remove_outliers_legend.includes(key)) {
          analysis.numerical[key].min = Math.min(...this.filterOutliers(data_tmp[key]))
          analysis.numerical[key].max = Math.max(...this.filterOutliers(data_tmp[key]))
        }
        else if (this.settings.force_extent_numerical && this.settings.force_extent_numerical[key]) {
            analysis.numerical[key].min = this.settings.force_extent_numerical[key].min;
            analysis.numerical[key].max = this.settings.force_extent_numerical[key].max;
        }
        else {
          // Default the active range to the same 1st-99th percentile window the violin draws,
          // rather than the true min/max - otherwise the legend's numbers (true extremes) and its
          // violin shape (percentile-trimmed) tell two different stories about the same metric.
          // Genes past this window still render (clamped to the endpoint color), they just don't
          // stretch the color scale's dynamic range across a couple of outliers.
          analysis.numerical[key].min = analysis.numerical[key].density.domainMin;
          analysis.numerical[key].max = analysis.numerical[key].density.domainMax;
        }

      });

      this.settings.data_metrics = analysis;

    },
    computeDensity(values) {
      const SAMPLES = 64;

      // The violin's axis is deliberately the 1st-99th percentile, not the true min/max: a single
      // extreme outlier (common in biological count data) would otherwise squeeze the whole
      // meaningful distribution into a few unusable pixels at one edge of the plot. The KDE itself
      // still sums over every value below, so mass beyond this window still shapes the curve near
      // its edges - it just isn't drawn past that point.
      const sorted = values.slice().sort((a, b) => a - b);
      const domainMin = d3.quantileSorted(sorted, 0.01);
      const domainMax = d3.quantileSorted(sorted, 0.99);

      if (values.length < 2 || domainMin === domainMax) {
        return {points: [], domainMin, domainMax, maxDensity: 0};
      }

      // Silverman's rule of thumb, with a floor so a near-flat distribution doesn't collapse to a spike
      const std = d3.deviation(values) || (domainMax - domainMin) / 4;
      const bandwidth = Math.max(1.06 * std * Math.pow(values.length, -0.2), (domainMax - domainMin) / 200);

      const step = (domainMax - domainMin) / (SAMPLES - 1);
      const points = [];
      let maxDensity = 0;

      for (let i = 0; i < SAMPLES; i++) {
        const x = domainMin + i * step;
        let sum = 0;
        for (let j = 0; j < values.length; j++) {
          const u = (x - values[j]) / bandwidth;
          sum += Math.exp(-0.5 * u * u);
        }
        const density = sum / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
        points.push({value: x, density});
        maxDensity = Math.max(maxDensity, density);
      }

      return {points, domainMin, domainMax, maxDensity};
    },
    filterOutliers(someArray) {

  // Copy the values, rather than operating on references to existing values
  var values = someArray.concat();

  // Then sort
  values.sort( function(a, b) {
    return a - b;
  });

  /* Then find a generous IQR. This is generous because if (values.length / 4)
   * is not an int, then really you should average the two elements on either
   * side to find q1.
   */
  var q1 = values[Math.floor((values.length / 4))];
  // Likewise for q3.
  var q3 = values[Math.ceil((values.length * (3 / 4)))];
  var iqr = q3 - q1;

  // Then find min and max values
  var maxValue = q3 + iqr*1.5;
  var minValue = q1 - iqr*1.5;

  // Then filter anything beyond or beneath these values.
  var filteredValues = values.filter(function(x) {
    return (x <= maxValue) && (x >= minValue);
  });

  // Then return
  return filteredValues;
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
        this.states_sorting = ['number_genes', 'name'];
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
    },
    exampleSearchId() {
      const contig = this.sortedData[1];
      if (!contig || !contig.nodes || contig.nodes.length === 0) {
        return '';
      }
      // pick a node past the very start of the contig, so the example isn't trivially the first gene
      const index = Math.min(Math.floor(contig.nodes.length / 3), contig.nodes.length - 1);
      return contig.nodes[index].id;
    }
  }

}
</script>


