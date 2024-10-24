<template>


 <div ref="interface_chr_small_container" id="interface_chr_small_container"  >

   <div id="interface_chr_small_container_div">
     <p id="chromosome_name">{{chromosome_name}}</p>
     <p id="chromosome_genes_desc">{{chromosome_genes_desc}}</p>
   </div>

   <svg ref="svg_overview" :width="CurrentWidth" style="border: 1px lightgray solid; border-radius: 18px;" :height="settings.svgHeight_overview" class="svg-element" ></svg>

   <svg ref="svg_mapper" :width="parentWidth" :height="settings.svgHeight_mapper" class="svg-element" ></svg>

   <svg ref="svg_excerpt" :width="parentWidth" :height="settings.svgHeight" class="svg-element"></svg>

   <div v-if="menuVisible" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }" class="menu">
     <div v-html="menuContent"></div>
     <button style='' @click="hideMenu">Close</button>
   </div>


 </div>

</template>

<script>

import * as d3 from 'd3';

export default {
  name: 'ChromosomeViewer',
  props: {
    datum: Object,
    settings: Object,
    domain_max: Number,
  },
  watch: {
    'datum.unique_id': {
      handler: function () {
        this.render_overview()
        this.render_mapper()
        this.render_excerpt()

      },
      deep: true
    },
    'settings': {
      handler: function () {
        this.render_overview()
        this.render_mapper()
        this.render_excerpt()

      },
      deep: true
    },
    'settings.mode': {
      handler: function () {
        this.render_overview()
        this.render_mapper()
        this.render_excerpt()

      },
      deep: true
    },
    'settings.hide': {
      handler: function () {
        this.toggleSvgDisplay()
      },
      deep: true
    },
    'settings.colorAccessor_overview': {
      handler: function () {
        this.render_overview()
      },
      deep: true,},
      'settings.heightAccessor_overview': {
        handler: function () {
          this.render_overview()
        },
        deep: true
      },
    'settings.colorAccessor_excerpt': {
      handler: function () {
        this.render_excerpt()
      },
      deep: true,},
    'settings.heightAccessor_excerpt': {
      handler: function () {
        this.render_excerpt()
      },
      deep: true
    },
    },
    computed: {
      domain_max_current() {
        const acc = this.settings.type_position === 'index' ? 'index' : 'start'
        return Math.max(...this.datum.nodes.map(d => d[acc]))
      },
      chromosome_name() {
        if (this.datum.type === 'ancestral') {
          return "Ancestral Chromosome"
        }
        if (!isNaN(this.datum.nodes[0]['chromosome']) || ['X', 'Y', 'MT'].includes(this.datum.nodes[0]['chromosome'])) {
          return "Chromosome " + this.datum.nodes[0]['chromosome']
        } else {
          return this.datum.nodes[0]['chromosome']
        }
      },
      chromosome_genes_desc() {
        if (this.datum.type === 'ancestral') {
          return this.datum.nodes.length + " ancestral genes "
        }
        return this.datum.nodes.length + " genes - " + this.pretty_locus(this.datum.size_in_bp) + " bp"
      },
      d_start() {
        return this.settings.type_position === 'loci' ? d => d.start : d => d.index
      },
      d_end() {
        return this.settings.type_position === 'loci' ? d => d.end : d => d.index + 0.5
      },
    },
    methods: {
      showMenu(event, d) {
        this.menuPosition = {x: event.clientX, y: event.clientY};
        this.menuContent = `Gene: ${d.id}`;

        this.settings.states_color_genes.forEach((state, i) => {
          this.menuContent += `<br><span style="color: ${this.color_scale(d.data[state])}">State ${i + 1}: ${d.data[state]}</span>`;
        });

        this.menuVisible = true;
      },
      hideMenu() {
        this.menuVisible = false;
      },
      toggleSvgDisplay() {
        const svgExcerpt = this.$refs.svg_excerpt;
        const svgMapper = this.$refs.svg_mapper;

        if (this.settings.hide) {
          svgExcerpt.style.display = 'none';
          svgMapper.style.display = 'none';
          return;
        } else {
          svgExcerpt.style.display = 'block';
          svgMapper.style.display = 'block';
        }
      },
      handleKeyup(event) {

        // modify the settings type_position when pressed the key 't'
        if (event.key === 'e') {
          this.toggleSvgDisplay();
        }
      },
      isInSelectedRegion(d) {
        return this.datum.selectedRegions.some(([x0, x1]) => this.d_start(d) >= x0 && this.d_end(d) <= x1);
      },
      pretty_locus(l) {
        return d3.format(",.9r")(parseInt(l))
      },
      render_mapper() {

        const scale_overview = d3.scaleLinear().domain([0, this.domain_max_current]).range([0, this.CurrentWidth - 2]);

        var svg_mapper = d3.select(this.$refs.svg_mapper)


        svg_mapper.selectAll('.line_top')
            .data(this.get_min_max()) // Bind the data to the rectangles
            .join(
                enter => enter.append('line')
                    .attr('class', 'line_top')
                    .attr('x1', (d) => scale_overview(d) + 1)
                    .attr('y1', 0)
                    .attr('x2', (d) => scale_overview(d) + 1)
                    .attr('y2', 10)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                update => update // For updated data, update the existing rectangles
                    .attr('x1', (d) => scale_overview(d) + 1)
                    .attr('x2', (d) => scale_overview(d) + 1)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );

        svg_mapper.selectAll('.line_bottom')
            .data(this.get_min_max()) // Bind the data to the rectangles
            .join(
                enter => enter.append('line')
                    .attr('class', 'line_bottom')
                    .attr('x1', (d) => scale_overview(d) + 1)
                    .attr('y1', 22)
                    .attr('x2', (d) => scale_overview(d) + 1)
                    .attr('y2', 32)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                update => update // For updated data, update the existing rectangles
                    .attr('x1', (d) => scale_overview(d) + 1)
                    .attr('x2', (d) => scale_overview(d) + 1)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );


        svg_mapper.selectAll('text')
            .data(this.get_min_max()) // Bind the data to the rectangles
            .join(
                enter => enter.append('text')
                    .attr('x', d => scale_overview(d))
                    .attr('y', 20) // Position the text 20 pixels below the line
                    .text(d => this.pretty_locus(d))// Set the text to the inverted scale value of max
                    .attr('font-size', '10px')
                    .attr('text-anchor', d => this.set_anchor_position(d)),
                update => update // For updated data, update the existing rectangles
                    .attr('x', d => scale_overview(d))
                    .attr('y', 20) // Position the text 20 pixels below the line
                    .text(d => this.pretty_locus(d))// Set the text to the inverted scale value of max
                    .attr('font-size', '10px')
                    .attr('text-anchor', d => this.set_anchor_position(d)),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );


        svg_mapper.selectAll('.line_diag')
            .data(this.get_min_max()) // Bind the data to the rectangles
            .join(
                enter => enter.append('line')
                    .attr('class', 'line_diag')
                    .attr('x1', (d, i) => scale_overview(d) + (i === 0 ? 1 : 1))
                    .attr('y1', 32)
                    .attr('x2', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                    .attr('y2', 42)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                update => update // For updated data, update the existing rectangles
                    .attr('x1', (d, i) => scale_overview(d) + (i === 0 ? 1 : 1))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );


      },
      render_overview() {




        const scale = d3.scaleLinear().domain([0, this.domain_max_current]).range([0, this.CurrentWidth]);
        const scale_height = this.set_height_gene_overview_scale()

        var svg_overview = d3.select(this.$refs.svg_overview)

        svg_overview.selectAll('rect')
            .data(this.datum.nodes) // Bind the data to the rectangles
            .join(
                enter => enter.append('rect') // For new data, append a new rectangle
                    .attr('x', d => scale(this.d_start(d)))
                    .attr('y', 0)
                    .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                    .attr('height', d => {return this.settings.heightAccessor_overview == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_overview])})
                    .attr("fill", this.color_gene_overview)
                    .attr('transform', d => {
              if  (this.settings.heightAccessor_overview == null) {
                return 'translate(0, 0)'
              } else {
                var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor_overview])
                return `translate( 0,${y})`
              }}),
                update => update // For updated data, update the existing rectangles
                    .attr('x', d => scale(this.d_start(d)))
                    .attr('y', 0)
                    .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                    .attr('height', d => {return this.settings.heightAccessor_overview == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_overview])})
                    .attr('transform', d => {
                      if  (this.settings.heightAccessor_overview == null) {
                        return 'translate(0, 0)'
                      } else {
                        var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor_overview])
                        return `translate(0, ${y})`
                      }})
                    .attr("fill", this.color_gene_overview),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );

      const scaleline = d3.scaleLinear().domain([0, this.domain_max_current]).range([0, this.CurrentWidth - 2]);
      svg_overview.selectAll('line')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('x1', d => scaleline(d))
                  .attr('y1', 0)
                  .attr('x2', d => scaleline(d))
                  .attr('y2', this.settings.svgHeight_overview)
                  .attr('stroke', 'grey')
                  .attr('opacity', this.settings.hide ? 0 : 1)
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', d => scaleline(d))
                  .attr('y1', 0)
                  .attr('x2', d => scaleline(d))
                  .attr('y2', this.settings.svgHeight_overview)
                  .attr('stroke', 'grey')
                  .attr('opacity', this.settings.hide ? 0 : 1)
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      },
      set_anchor_position(d) {
        var [min, max] = this.get_min_max()
        var scale = d3.scaleLinear().domain([0, this.domain_max]).range([0, this.CurrentWidth]);
        var minPixel = scale(min);
        var maxPixel = scale(max);
        var threshold = 150; // Set a threshold for the minimum pixel distance to avoid overlap

        if (d === min && minPixel < threshold / 2) {
          return 'start';
        }

        if (d === max && this.CurrentWidth - maxPixel < threshold) {
          return 'end';
        }
        if (Math.abs(maxPixel - minPixel) < threshold / 2) {
          // If min and max are too close to each other, reverse the anchor position
          return d === min ? 'end' : 'start';
        } else {
          return d === min ? 'middle' : 'middle';
        }
      },
      get_min_max() {
        var min = this.datum.domain !== null ? this.datum.domain[0] : 0
        var max = this.datum.domain !== null ? this.datum.domain[1] : this.domain_max

        return [min, max]
      },
      color_gene_overview(d) {

        if (!this.settings.hide){
          var [min, max] = this.get_min_max()
          if (this.d_start(d) >= min && this.d_end(d) <= max) {
            return this.settings.brushed_gene_color
          }
        }



        switch (this.settings.colorAccessor_overview) {
          case 'datum1':
            return this.color_scale_overview(d.data.datum1)
          case 'datum2':
            return this.color_scale_overview(d.data.datum2)
          default:
            return this.settings.defaut_gene_color
        }
      },
      set_height_gene_overview_scale() {

        if (this.settings.heightAccessor_overview === null) {
          return this.settings.svgHeight_overview;
        }

        else { // TODO GET REAL EXTENT
          return d3.scaleLinear().domain([-1, 1]).range([0, this.settings.svgHeight_overview]);
        }

      },
      color_gene_excerpt(d) {

        if (this.isInSelectedRegion(d)) {
          return this.settings.selected_gene_color
        }

        switch (this.settings.colorAccessor_excerpt) {
          case 'datum1':
            return this.color_scale_overview(d.data.datum1)
          case 'datum2':
            return this.color_scale_overview(d.data.datum2)
          default:
            return this.settings.defaut_gene_color
        }
      },
      set_height_gene_excerpt_scale() {

        if (this.settings.heightAccessor_excerpt === null) {
          return this.settings.svgHeight;
        }

        else { // TODO GET REAL EXTENT
          return d3.scaleLinear().domain([-1, 1]).range([0, this.settings.svgHeight]);
        }

      },
      render_excerpt() {

        const scale = d3.scaleLinear().domain([0, this.domain_max_current]).range([0, this.parentWidth]);

        const scale_height = this.set_height_gene_excerpt_scale()

        var svg_excerpt = d3.select(this.$refs.svg_excerpt)

        svg_excerpt.selectAll('rect')
            .data(this.datum.nodes) //.filter(d => this.d_start(d) >= this.datum.domain[0] && this.d_end(d) <= this.datum.domain[1]))
            .join(
                enter => enter.append('rect') // For new data, append a new rectangle
                    .attr('x', d => scale(this.d_start(d)))
                    .attr('y', this.margin_top_svg)
                    .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                    .attr('height', d => {return this.settings.heightAccessor_excerpt == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_excerpt])})
                    .on('click', (event, d) => this.showMenu(event, d))
                    .attr('transform', d => {
                      if  (this.settings.heightAccessor_excerpt == null) {
                        return 'translate(0, 0)'
                      } else {
                        var y = this.settings.svgHeight - scale_height(d.data[this.settings.heightAccessor_excerpt])
                        return `translate(0, ${y})`
                      }})
                    .attr('fill', d => this.color_gene_excerpt(d)),
                update => update // For updated data, update the existing rectangles
                    .attr('x', d => scale(this.d_start(d)))
                    .attr('y', this.margin_top_svg)
                    .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                    .attr('height', d => {return this.settings.heightAccessor_excerpt == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_excerpt])})
                    .on('click', (event, d) => this.showMenu(event, d))
                    .attr('transform', d => {
                      if  (this.settings.heightAccessor_excerpt == null) {
                        return 'translate(0, 0)'
                      } else {
                        var y = this.settings.svgHeight - scale_height(d.data[this.settings.heightAccessor_excerpt])
                        return `translate(0, ${y})`
                      }})

                    .attr('fill', d => this.color_gene_excerpt(d)),
                exit => exit.remove() // For outgoing data, remove the rectangles
            );


        svg_excerpt.selectAll('.line_extend')
            .data(this.get_min_max()) // Bind the data to the rectangles
            .join(
                enter => enter.append('line')
                    .attr('class', 'line_diag')
                    .attr('x1', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                    .attr('y1', 0)
                    .attr('x2', (d, i) => i === 0 ? 1 : this.parentWidth - 1)
                    .attr('y2', 20)
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 2),
            );


        // Define the zoomed function
        var zoomed = (event) => {
          // Get the new scale
          var newScale = event.transform.rescaleX(scale);

          // Update the rectangles with the new scale
          const [x0, x1] = newScale.domain();



          this.emitEvent('domainChanged',  [x0, x1] );
          this.emitEvent( 'updateZoom', event.transform );

          this.render_overview()
          this.render_mapper()

          svg_excerpt.selectAll('rect')
              .attr('x', d => newScale(this.d_start(d)))
              .attr('width', d => newScale(this.d_end(d)) - newScale(this.d_start(d)));

        }

        // Create the zoom behavior
        var zoom = d3.zoom()
            .scaleExtent([1, Infinity]) // This controls the zoom limit. [1, Infinity] means it can only zoom in.
            .translateExtent([[scale(0), 0], [scale(this.domain_max), 0]]) // This controls the panning limit.
            .on('zoom', zoomed); // This sets the function to be called when a zoom event occurs.

        svg_excerpt.call(zoom);

        if (this.datum.currentZoom) {
          svg_excerpt.call(zoom.transform, this.datum.currentZoom);
        }


        var brushed = (event) => {

          if (event.sourceEvent == null) {
            return
          }

          const selection = event.selection;

          if (selection === null) {
            console.log('Brush cleared')
          } else {


            var newScale = this.datum.currentZoom.rescaleX(scale);
            const [x0, x1] = selection.map(newScale.invert);
            this.emitEvent('addSelectedRegions', [x0, x1] );
            this.render_excerpt();
            this.render_mapper()
            this.render_overview();
          }

          svg_excerpt.call(brush.move, null);

        }

        var brush = d3.brushX()
            .extent([[0, 0], [this.CurrentWidth, this.settings.svgHeight]])
            .on("end", brushed)


        if (this.settings.mode === 'zoom') {
          // Remove the brush behavior and apply the zoom behavior
          svg_excerpt.on('.brush', null);
          svg_excerpt.call(zoom);
        } else {
          // Remove the zoom behavior and apply the brush behavior
          svg_excerpt.on('.zoom', null);
          svg_excerpt.call(brush);
        }


      },
      get_parentWidth() {
        return (this.$refs['interface_chr_small_container'].offsetWidth * (this.domain_max_current / this.domain_max)) - (window.innerWidth * 0.04);
      },
      emitEvent(eventType, payload = null) {
        this.$emit('chromosome-event', {eventType, payload});
      },
    },
    mounted() {
      window.addEventListener('keyup', this.handleKeyup);
      this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth - (window.innerWidth * 0.04);
      this.CurrentWidth = this.get_parentWidth();

      this.render_excerpt();
      this.render_mapper();
      this.render_overview();

    },
    data() {
      return {
        CurrentWidth: null,
        parentWidth: null,
        color_scale_overview: d3.scaleLinear([-1, 0, 1], ['#ffafcc', '#bde0fe', '#a2d2ff']),
        color_scale: d3.scaleLinear([-1, 0, 1], ['#ffafcc', '#bde0fe', '#a2d2ff']),
        margin_top_svg: 0,
        menuVisible: false,
        menuPosition: {x: 0, y: 0},
        menuContent: ''
      }
    },
  emits: ['chromosome-event'],
  }


</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.svg-element {
display: block;
}

#interface_chr_small_container {
  padding: 2vw;
  width: 100%;
}

#interface_chr_small_container_div {
  display: flex;
  justify-content: space-between;
}

#chromosome_name {
  text-align: left;
  font-weight: bold;
  color: rgb(99,99,102);
}

#chromosome_genes_desc {
  text-align: right;
  color: rgb(99,99,102);
}

.brush .selection {
  display: none !important;
}

.menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  padding: 10px;
  z-index: 1000;
}

</style>
