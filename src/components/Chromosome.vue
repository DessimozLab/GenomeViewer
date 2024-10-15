<template>


 <div ref="interface_chr_small_container" style="width: 100%">

   <div style="display: flex; justify-content: space-between;">
     <p style="text-align: left;font-weight: bold">{{chromosome_name}}</p>
     <p style="text-align: right;font-weight: bold">{{chromosome_genes_desc}}</p>
   </div>

     <svg ref="svg_overview" :width="parentWidth" :height="svgHeight" class="svg-element" >
       <rect x="0" y="0" ></rect>
     </svg>

     <svg ref="svg_excerpt" :width="excerptWidth" :height="svgHeight"  style='display:none' class="svg-element">
     </svg>

 </div>

  <br>
  <br>
</template>

<script>

import * as d3 from 'd3';


export default {
  name: 'ChromosomeViewer',
  props: {
    datum: Object,
    settings: Object
  },
  watch: {
    'datum.unique_id': {
      handler: function () {
        this.set_chromosome_name()
        this.set_chromosome_length()
        this.render_excerpt()
        this.render_overview()
      },
      deep: true
    }
  },
  computed: {
    chromosome_name(){
      if (this.datum.type == 'ancestral') {
        return "Ancestral Chromosome"
      }
      if (!isNaN(this.datum.nodes[0]['chromosome']) || ['X', 'Y', 'MT'].includes(this.datum.nodes[0]['chromosome']) ){return "Chromosome " + this.datum.nodes[0]['chromosome']}
      else{return this.datum.nodes[0]['chromosome']}
    },
    chromosome_genes_desc(){
      if (this.datum.type == 'ancestral') {
        return this.datum.nodes.length + " ancestral genes "
      }
      return this.datum.nodes.length + " genes - " + d3.format(",.9r")(parseInt(this.datum.size_in_bp))  + " bp"
    }
  },
  methods: {
    set_chromosome_name() {
      if (this.datum.nodes[0]['chromosome']) {
        this.name = this.datum.nodes[0]['chromosome']
      }
    },
    set_chromosome_length() {
      this.size_in_bp = this.datum.size_in_bp
    },
    render_overview() {

      var svg_overview = d3.select(this.$refs.svg_overview)
      var x;

      if (this.settings.type_chromosome == 'ancestral') {
        x = d3.scaleLinear()
            .domain([0, 1000])
            .range([0, this.parentWidth])
      }
      else{
        x = d3.scaleLinear()
            .domain([0, 300000000])
            .range([0, this.parentWidth])
      }


      var rectangles = svg_overview.selectAll('rect')
          .data(this.datum.nodes)
          .join('rect')
          .attr('x', d => x(d.start))
          .attr('y', 0)
          .attr('width', d => x(d.end) - x(d.start))
          .attr('height', 50)
          .attr("fill", (d) => {
            if (this.datum.domain == null) {
              return 'salmon'
            }
            return this.datum.domain[0] <= d.end && d.start <= this.datum.domain[1] ? "steelblue" : 'salmon'
      });



      var brush = d3.brushX()
          .extent([[0, 0], [this.parentWidth, 50]])
          .on("start brush end", brushed)

      var gBrush =  svg_overview.append("g")
          .call(brush)

      if (this.datum.domain !== null) {
        var start = x(this.datum.domain[0]);
        var end = x(this.datum.domain[1]);
        gBrush.call(brush.move, [start, end]);
      }



      var that = this


      function brushed(event) {

        if (event.sourceEvent == null){
          return
        }

        const selection = event.selection;

        if (selection === null) {
          that.$emit('domainChanged', null);
          rectangles.attr("fill", 'salmon');
        } else {
          const [x0, x1] = selection.map(x.invert);
          that.$emit('domainChanged', [x0, x1]);
          rectangles.attr("fill", (d) => {
            return x0 <= d.end && d.start <= x1 ? "steelblue" : 'salmon'
          });
          that.render_excerpt();
        }


      }
    },
    render_excerpt() {

      var svg_excerpt = d3.select(this.$refs.svg_excerpt)
      var domain = this.datum.domain

      if (domain == null) {
        svg_excerpt.style('display', 'none')
        return
      }
      else{
        svg_excerpt.style('display', 'block')
      }

      svg_excerpt.attr("transform", "translate(" + this.excerptWidth /2+ "," + 0 + ")")
          .attr('stroke', 'black')

      var x_cerpt = d3.scaleLinear()
          .domain(domain)
          .range([0, this.excerptWidth])

      svg_excerpt.selectAll('rect')
          .data(this.datum.nodes.filter(d => d.start >= this.datum.domain[0] && d.end <= this.datum.domain[1]))
          .join('rect')
          .attr('x', d => x_cerpt(d.start))
          .attr('y', 0)
          .attr('width', d => x_cerpt(d.end) - x_cerpt(d.start))
          .attr('height', this.svgHeight)
          .style('fill', 'lightgrey')
    },
  },
  mounted() {

    this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth;
    this.excerptWidth = this.parentWidth / 2;
    this.render_excerpt();
    this.render_overview()

  },
  data() {
    return {
      parentWidth: 400,
      excerptWidth: 200,
      name: '',
      svgHeight: 80,
    }
  },
  emits: ['domainChanged'],
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.svg-element {
  margin-bottom: 20px;
}
</style>
