<template>

 <div ref="interface_chr_small_container" style="width: 100%">

   <div style="display: flex; justify-content: space-between;">
     <p style="text-align: left;font-weight: bold">{{this.chromosome_name}}</p>
     <p style="text-align: right;font-weight: bold">{{chromosome_genes_desc}}</p>
   </div>


     <svg ref="svg_overview" :viewBox="viewbox"  >
       <rect x="0" y="0" width="1000" height="50" fill="salmon"></rect>
     </svg>

   <br>

   <br>


     <svg ref="svg_excerpt" :viewBox="viewbox"  style='display:none'>
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
    datum: Object
  },
  computed: {
    viewbox() {
      return `0 0 ${this.parentWidth} 50`
    },
    chromosome_name(){
      if (!isNaN(this.name) || ['X', 'Y', 'MT'].includes(this.name) ){return "Chromosome " + this.name}
      else{return this.name}
    },
    chromosome_genes_desc(){
      return this.datum.nodes.length + " genes - " + this.datum.size_in_bp  + " bp" //d3.format(",.9r")(parseInt(this.size_in_bp))  +
    }
  },
  methods: {
    set_chromosome_name() {
      console.log(this.datum.nodes[0]['chromosome'])
      if (this.datum.nodes[0]['chromosome']) {
        this.name = this.datum.nodes[0]['chromosome']
      }
    },
    set_chromosome_length() {
      this.size_in_bp = this.datum.size_in_bp
    },
    render_overview() {

      var svg_overview = d3.select(this.$refs.svg_overview)

      var x = d3.scaleLinear()
          .domain([0, 300000000])
          .range([0, this.parentWidth])

      var rectangles = svg_overview.selectAll('rect')
          .data(this.datum.nodes)
          .join('rect')
          .attr('x', d => x(d.start))
          .attr('y', 0)
          .attr('width', d => x(d.end) - x(d.start))
          .attr('height', 50)
          .attr('fill', 'salmon')

      var brush = d3.brushX()
          .extent([[0, 0], [this.parentWidth, 50]])
          .on("start brush end", brushed)

      svg_overview.append("g")
          .call(brush)

      var that = this


      function brushed(event) {

        const selection = event.selection;


        if (selection === null) {
          rectangles.attr("fill", 'salmon');
        } else {
          const [x0, x1] = selection.map(x.invert);
          rectangles.attr("fill", (d) => {
            return x0 <= d.end && d.start <= x1 ? "steelblue" : 'salmon'
          });
          that.render_excerpt([x0, x1]);
        }


      }
    },
    render_excerpt(domain) {

      var svg_excerpt = d3.select(this.$refs.svg_excerpt)


      if (domain == null) {
        svg_excerpt.style('display', 'none')
        return
      }

      svg_excerpt.style('display', 'block')




      var width = this.parentWidth
      var height = 80;

      svg_excerpt
          .attr("viewBox", [0, 0, width, height])
          .attr("width", width/2)
          .attr("transform", "translate(" + width /4+ "," + 0 + ")")
          .attr('stroke', 'black')

      var x_cerpt = d3.scaleLinear()
          .domain(domain)
          .range([0, width])


      svg_excerpt.selectAll('rect')
          .data(this.datum.nodes)
          .join('rect')
          .attr('x', d => x_cerpt(d.start))
          .attr('y', 0)
          .attr('width', d => x_cerpt(d.end) - x_cerpt(d.start))
          .attr('height', height)
          .style('fill', 'lightgrey')
    },
  },
  mounted() {

    this.set_chromosome_name()

    this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth;
    this.render_overview()

  },
  data() {
    return {
      parentWidth: 400,
      name: ''
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
