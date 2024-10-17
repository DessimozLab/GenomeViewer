<template>


 <div ref="interface_chr_small_container" id="interface_chr_small_container"  >

   <div id="interface_chr_small_container_div">
     <p id="chromosome_name">{{chromosome_name}}</p>
     <p id="chromosome_genes_desc">{{chromosome_genes_desc}}</p>
   </div>

   <svg ref="svg_excerpt" :width="parentWidth" :height="settings.svgHeight" class="svg-element">
     </svg>

   <svg ref="svg_overview" :width="parentWidth" :height="settings.svgHeight_overview" class="svg-element" >
   </svg>

 </div>

</template>

<script>

import * as d3 from 'd3';

export default {
  name: 'ChromosomeViewer',
  props: {
    datum: Object,
    settings: Object,
    domain_max: Number
  },
  watch: {
    'datum.unique_id': {
      handler: function () {
        this.render_overview()
        this.render_excerpt()

      },
      deep: true
    },
    'settings': {
      handler: function () {
        this.render_overview()
        this.render_excerpt()

      },
      deep: true
    },
    'settings.mode': {
      handler: function () {
        this.render_overview()
        this.render_excerpt()

      },
      deep: true
    },
  },
  computed: {
    chromosome_name(){
      if (this.datum.type === 'ancestral') {
        return "Ancestral Chromosome"
      }
      if (!isNaN(this.datum.nodes[0]['chromosome']) || ['X', 'Y', 'MT'].includes(this.datum.nodes[0]['chromosome']) ){return "Chromosome " + this.datum.nodes[0]['chromosome']}
      else{return this.datum.nodes[0]['chromosome']}
    },
    chromosome_genes_desc(){
      if (this.datum.type === 'ancestral') {
        return this.datum.nodes.length + " ancestral genes "
      }
      return this.datum.nodes.length + " genes - " + this.pretty_locus(this.datum.size_in_bp)  + " bp"
    },
    d_start(){
      return this.settings.type_position === 'loci' ? d => d.start : d => d.index
    },
    d_end(){
      return this.settings.type_position === 'loci' ? d => d.end : d => d.index + 0.5
    },
  },
  methods: {
    isInSelectedRegion(d) {
      return this.datum.selectedRegions.some(([x0, x1]) => this.d_start(d) >= x0 && this.d_end(d) <= x1);
    },
    pretty_locus(l){
      return d3.format(",.9r")(parseInt(l))
    },
    render_overview() {

      const scale = d3.scaleLinear().domain([0, this.domain_max]).range([0, this.parentWidth]);

      var svg_overview = d3.select(this.$refs.svg_overview)

      svg_overview.selectAll('rect')
          .data(this.datum.nodes) // Bind the data to the rectangles
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', this.settings.svgHeight_overview-20)
                  .attr("fill", this.color_gene_overview),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr("fill",  this.color_gene_overview),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      svg_overview.selectAll('line')
          .data( this.get_min_max() ) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
          .attr('x1', d => scale(d))
          .attr('y1', 0)
          .attr('x2', d => scale(d))
          .attr('y2', this.settings.svgHeight_overview-20)
          .attr('stroke', 'grey')
          .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', d => scale(d))
                  .attr('y1', 0)
                  .attr('x2', d => scale(d))
                  .attr('y2', this.settings.svgHeight_overview-20)
                  .attr('stroke', 'grey')
                  .attr('stroke-width', 2),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      svg_overview.selectAll('text')
          .data( this.get_min_max() ) // Bind the data to the rectangles
          .join(
              enter => enter.append('text')
                  .attr('x', d => scale(d))
                  .attr('y', this.settings.svgHeight_overview - 10) // Position the text 20 pixels below the line
                  .text(d =>  this.pretty_locus(d))// Set the text to the inverted scale value of max
                  .attr('font-size', '10px')
                  .attr('text-anchor', d => this.set_anchor_position(d)),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(d))
                  .attr('y', this.settings.svgHeight_overview - 10) // Position the text 20 pixels below the line
                  .text(d =>  this.pretty_locus(d))// Set the text to the inverted scale value of max
                  .attr('font-size', '10px')
                  .attr('text-anchor', d => this.set_anchor_position(d)),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


    },
    set_anchor_position(d){
      var [min, max] = this.get_min_max()
      var scale = d3.scaleLinear().domain([0, this.domain_max]).range([0, this.parentWidth]);
      var minPixel = scale(min);
      var maxPixel = scale(max);
      var threshold = 150; // Set a threshold for the minimum pixel distance to avoid overlap

      if (d === min && minPixel < threshold/2) {
        return 'start';}

        if (d === max && this.parentWidth - maxPixel < threshold) {
        return 'end';
      }
      if (Math.abs(maxPixel - minPixel) < threshold/2) {
        // If min and max are too close to each other, reverse the anchor position
        return d === min ? 'end' : 'start';
      } else {
        return d === min ? 'middle' : 'middle';
      }
    },
    get_min_max(){
      var min = this.datum.domain !== null ? this.datum.domain[0] : 0
      var max = this.datum.domain !== null ? this.datum.domain[1] : this.domain_max

      return [min, max]
    },
    color_gene_overview(d){

      var [min, max] = this.get_min_max()

      // define position min and max based on the domain if create or not

      return  this.d_start(d) >= min && this.d_end(d) <= max ? this.settings.brushed_gene_color : this.settings.defaut_gene_color
    },
    render_excerpt() {

      const scale = d3.scaleLinear().domain([0, this.domain_max]).range([0, this.parentWidth]);

      var svg_excerpt = d3.select(this.$refs.svg_excerpt)

      svg_excerpt.selectAll('rect')
          .data(this.datum.nodes) //.filter(d => this.d_start(d) >= this.datum.domain[0] && this.d_end(d) <= this.datum.domain[1]))
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', this.settings.svgHeight)
                  .attr('fill', d => this.isInSelectedRegion(d) ? 'olive' : 'lightgrey'),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', this.settings.svgHeight)
                  .attr('fill', d => this.isInSelectedRegion(d) ? 'olive' : 'lightgrey'),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      // Define the zoomed function
      var zoomed = (event) =>  {
        // Get the new scale
        var newScale = event.transform.rescaleX(scale);

        // Update the rectangles with the new scale
        const [x0, x1] = newScale.domain();
        this.$emit('domainChanged', [x0, x1]);
        this.$emit('updateZoom', event.transform);

        this.render_overview()

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

       if (event.sourceEvent == null){
         return
       }

       const selection = event.selection;

       if (selection === null) {
          console.log('Brush cleared')
       }
       else {


         var newScale = this.datum.currentZoom.rescaleX(scale);



         const [x0, x1] = selection.map(newScale.invert);

         this.$emit('addSelectedRegions', [x0, x1]);
         this.render_excerpt();
         this.render_overview();
       }

       svg_excerpt.call(brush.move, null);

     }

     var brush = d3.brushX()
         .extent([[0, 0], [this.parentWidth, this.settings.svgHeight]])
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
  },
  mounted() {
    this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth - (window.innerWidth * 0.04);
    this.render_excerpt();
    this.render_overview()

  },
  data() {
    return {
      parentWidth: null
    }
  },
  emits: ['domainChanged', 'updateZoom', 'addSelectedRegions']
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.svg-element {
  margin-bottom: 1px;
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

</style>
