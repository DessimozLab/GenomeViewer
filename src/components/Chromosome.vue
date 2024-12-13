<template>




 <div ref="interface_chr_small_container" id="interface_chr_small_container"  >

   <div id="interface_chr_small_container_div">
     <div style="margin-right: auto; display: flex">

       <p id="chromosome_name" >{{chromosome_name}}</p>

       <p  style="font-size: small; align-self: end" id="chromosome_genes_desc" >{{chromosome_genes_desc}}</p>

       <!-- Add button if genes are selected that remove all seelcted genes in this chromsome call unselect all-->
        <ButtonWithIcon
            buttonStyle="padding: 6px; height: 29px; margin-right: 8px; margin-left: 8px;"
            id="unselect_all"
            icon="null"
            text="Unselect Genes"
            @click="this.emitEvent('unselect-all')"
            v-if="this.get_selected_genes(this.datum.nodes).length > 0"
        />


     </div>

     <div style="margin-left: auto">

       <ButtonWithIcon
           id="download_svg"
           icon="null"
           text=".SVG"
           @click="this.downloadSVG"
       />

       <ButtonWithIcon
           id="download_png"
           icon="null"
           text=".PNG"
           @click="this.downloadPNG"
       />

     </div>

   </div>



   <svg ref="svg_overview" :width="CurrentWidth" style="border: 1px lightgray solid; border-radius: 18px;" :height="settings.svgHeight_overview" class="svg-element" ></svg>

   <svg ref="svg_mapper" :width="parentWidth" :height="settings.svgHeight_mapper" class="svg-element" ></svg>

   <svg ref="svg_excerpt" :width="parentWidth" :height="settings.svgHeight" class="svg-element"></svg>

   <div v-if="menuVisible" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }" class="menu">

     <div class="tooltip__content__item">
       <button class="close-button" @click="hideMenu">&times;</button>
     </div>

     <div v-for="item in menuContent" :key="item.id" style="margin-right: 36px">
       <div class="tooltip__content__item">
         <div :style=item.style :class="item.class" @click="item.click" v-html="item.content"></div>
       </div>
     </div>
   </div>


 </div>

</template>

<script>

import * as d3 from 'd3';
import ButtonWithIcon from './ButtonWithIcon.vue';

export default {
  name: 'ChromosomeViewer',
  components: {
    ButtonWithIcon,
  },
  props: {
    datum: Object,
    settings: Object,
    domain_max: Number,
  },
  watch: {

    'settings.data_metrics.numerical': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'datum.unique_id': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'domain_max': {
      handler: function () {
        this.CurrentWidth = this.getCurrentWidth()
        this.update_renders()

      },
      deep: true
    },
    'settings': {
      handler: function () {
        this.update_renders()

      },
      deep: true
    },
    'settings.mode': {
      handler: function () {
        this.CurrentWidth = this.getCurrentWidth()
        this.update_renders()

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
        this.update_renders()
      },
      deep: true,
    },
    'settings.heightAccessor_overview': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
    'settings.color_scheme': {
      handler: function () {
        this.color_scheme = this.settings.color_scheme_list[this.settings.color_scheme]
        this.update_renders()
      },
      deep: true
    },
    'settings.colorAccessor_excerpt': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
    'settings.colorAccessor_excerpt_edge': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
    'settings.heightAccessor_excerpt': {
      handler: function () {
        this.update_renders()
      },
      deep: true
    },
  },
  computed: {
    // SCALE
    color_scale_excerpt() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_excerpt]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .interpolator(this.color_scheme);
    },
    color_scale_excerpt_edge() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_excerpt_edge]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .interpolator(this.color_scheme);
    },
    color_scale_overview() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_overview]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .interpolator(this.color_scheme);
    },
    color_scale() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_overview]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .interpolator(this.color_scheme);
    },

    // GETTER
    domain_max_current() {
      const acc = this.settings.type_position === 'index' ? 'index' : 'start'
      return Math.max(...this.datum.nodes.map(d => d[acc]))
    },
    domain_min_current() {
      const acc = this.settings.type_position === 'index' ? 'index' : 'start'
      return Math.min(...this.datum.nodes.map(d => d[acc]))
    },
    chromosome_name() {
      return this.datum.name
    },
    chromosome_genes_desc() {

      var s = this.get_selected_genes(this.datum.nodes).length

      var desc = this.datum.nodes.length + (this.datum.type === 'ancestral' ? " ancestral genes " : " genes ")

      if (s > 0) {
        desc += "( " + s + " selected )"
      }

      if (this.datum.type === 'extant') {
        desc += "- " + this.pretty_locus(this.datum.size_in_bp) + " bp"
      }

      return desc

    },
    d_start() {
      return this.settings.type_position === 'loci' ? d => d.start : d => d.index
    },
    d_end() {
      return this.settings.type_position === 'loci' ? d => d.end : d => d.index + 0.5
    },
  },
  methods: {
    update_renders() {
      this.render_overview()
      this.render_mapper()
      this.render_excerpt()
    },
    callback_click_synteny(test) {
      return this.settings.callback_click_synteny(test)
    },
    callback_click_detail(test) {
      return  this.settings.callback_click_detail(test)
    },
    callback_click_members(test) {
      return  this.settings.callback_click_members(test)
    },
    combineSVGs() {
      const svgElements = [
        this.$refs.svg_overview,
        this.$refs.svg_mapper,
        this.$refs.svg_excerpt
      ];

      const padding = 10; // Add padding
      const combinedSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      combinedSVG.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      combinedSVG.setAttribute("width", this.parentWidth + padding * 2);
      combinedSVG.setAttribute("height", this.settings.svgHeight_overview + this.settings.svgHeight_mapper + this.settings.svgHeight + padding * 2);

      let yOffset = padding;
      svgElements.forEach(svg => {
        const clonedSVG = svg.cloneNode(true);
        clonedSVG.setAttribute("y", yOffset);
        clonedSVG.setAttribute("x", padding); // Add padding to x position
        combinedSVG.appendChild(clonedSVG);
        yOffset += parseFloat(svg.getAttribute("height"));
      });

      return combinedSVG;
    },
    downloadSVG() {
      const combinedSVG = this.combineSVGs();
      const serializer = new XMLSerializer();
      const svgBlob = new Blob([serializer.serializeToString(combinedSVG)], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "chromosome_viewer_" + this.chromosome_name + ".svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    downloadPNG() {
      const combinedSVG = this.combineSVGs();
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(combinedSVG);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = new Image();

      canvas.width = combinedSVG.getAttribute("width");
      canvas.height = combinedSVG.getAttribute("height");

      // Set the background color to white
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);


      img.onload = () => {
        context.drawImage(img, 0, 0);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "chromosome_viewer_" + this.chromosome_name + ".png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, "image/png");
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgString);
    },

    // RENDER
    render_mapper() {

      const scale_overview = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);

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


      // add line beneath rectangles section to show wich part is selected in excerpt
      const scaleline = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);

      svg_mapper.selectAll('.line_selected')
          .data(this.datum.selectedRegions) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_selected')
                  .attr('x1', d => scaleline(d[0]))
                  .attr('y1', 3)
                  .attr('x2', d => scaleline(d[1]))
                  .attr('y2', 3)
                  .attr('stroke', this.settings.selected_gene_color)
                  .attr('opacity', 1)
                  .attr('stroke-width', 2),
              update => update // For updated data, update the existing rectangles
                  .attr('x1', d => scaleline(d[0]))
                  .attr('x2', d => scaleline(d[1])),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


    },
    render_overview( ) {

      const scale = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth]);
      const scale_height = this.set_height_gene_overview_scale()

      var svg_overview = d3.select(this.$refs.svg_overview)

      svg_overview.selectAll('rect')
          .data(this.datum.nodes) // Bind the data to the rectangles
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('opacity', 0.8)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor_overview == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_overview])
                  })
                  .attr("fill", this.color_gene_overview)
                  .attr('transform', d => {
                    if (this.settings.heightAccessor_overview == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor_overview])
                      return `translate( 0,${y})`
                    }
                  }),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor_overview == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_overview])
                  })
                  .attr('transform', d => {
                    if (this.settings.heightAccessor_overview == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor_overview])
                      return `translate(0, ${y})`
                    }
                  })
                  .attr("fill", this.color_gene_overview),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      const scaleline = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.CurrentWidth - 2]);
      svg_overview.selectAll('line')
          .data(this.get_min_max()) // Bind the data to the rectangles
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_extent_overview')
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
    render_excerpt( ) {

      const scale = d3.scaleLinear().clamp(true).domain([this.domain_min_current, this.domain_max_current]).range([0, this.parentWidth]);

      const scale_height = this.set_height_gene_excerpt_scale()

      var svg_excerpt = d3.select(this.$refs.svg_excerpt)



      svg_excerpt.selectAll('rect')
          .data(this.datum.nodes) //.filter(d => this.d_start(d) >= this.datum.domain[0] && this.d_end(d) <= this.datum.domain[1]))
          .join(
              enter => enter.append('rect') // For new data, append a new rectangle
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', this.margin_top_svg)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor_excerpt == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_excerpt])
                  })
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => {
                    if (this.settings.heightAccessor_excerpt == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight - scale_height(d.data[this.settings.heightAccessor_excerpt])
                      return `translate(0, ${y})`
                    }
                  })
                  .attr('fill', d => this.color_gene_excerpt(d)),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', this.margin_top_svg)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor_excerpt == null ? scale_height : scale_height(d.data[this.settings.heightAccessor_excerpt])
                  })
                  .attr('opacity', 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => {
                    if (this.settings.heightAccessor_excerpt == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight - scale_height(d.data[this.settings.heightAccessor_excerpt])
                      return `translate(0, ${y/2})`
                    }
                  })
                  .attr('fill', d => this.color_gene_excerpt(d)),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );


      svg_excerpt.selectAll('.line_between_right')
          .data(this.datum.nodes.slice(0, this.datum.nodes.length - 1))
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_between_right')
                  .attr('x1', (d) => scale(this.d_start(d)))
                  .attr('y1', this.settings.svgHeight / 2)
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i])))
                  .attr('y2',this.settings.svgHeight / 2)
                  .attr('stroke', d =>  this.color_edge_excerpt(d))
                  .attr('stroke-width', this.settings.edge_height),
              update => update
                  .attr('x1', (d) => scale(this.d_start(d)))
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i])))
                  .attr('stroke',d =>  this.color_edge_excerpt(d)),
              exit => exit.remove()
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


        this.emitEvent('domainChanged', [x0, x1]);
        this.emitEvent('updateZoom', event.transform);

        this.render_overview()
        this.render_mapper()



        svg_excerpt.selectAll('rect')
            .attr('x', d => newScale(this.d_start(d)))
            .attr('width', d => newScale(this.d_end(d)) - newScale(this.d_start(d)));

        svg_excerpt.selectAll('.line_between_right')
            .attr('x1', (d) => newScale(this.d_end(d)))
            .attr('x2', (d,i) => newScale(this.d_start(this.datum.nodes[i+1])))


      };


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
          this.emitEvent('addSelectedRegions', [x0, x1]);
          this.render_excerpt();
          this.render_mapper()
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


    // SCALE & COLOR
    color_gene_overview(d) {

      if (this.settings.colorAccessor_overview === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale_overview(d.data[this.settings.colorAccessor_overview])

    },
    set_height_gene_overview_scale() {

      if (this.settings.heightAccessor_overview === null) {
        return this.settings.svgHeight_overview;
      } else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor_overview]
        return d3.scaleLinear().clamp(true).domain([extent.min, extent.max]).range([0, this.settings.svgHeight_overview]);
      }

    },
    color_gene_excerpt(d) {

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor_excerpt === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale_excerpt(d.data[this.settings.colorAccessor_excerpt])

    },
    color_edge_excerpt(d) {

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor_excerpt_edge === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale_excerpt_edge(d.data[this.settings.colorAccessor_excerpt_edge])

    },
    set_height_gene_excerpt_scale() {

      if (this.settings.heightAccessor_excerpt === null) {
        return this.settings.svgHeight;
      }

      else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor_excerpt]
        return d3.scaleLinear().clamp(true).domain([extent.min, extent.max]).range([0, this.settings.svgHeight]);
      }

    },

    // UI INTERACTION
    showMenu(event, d) {

      this.menuPosition = {x: event.pageX, y: event.pageY};

      this.menuContent = []

      this.menuContent.push({class: 'title', content: d.id , click:null, style: "font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em;text-align: center;"})


      // fetch and display OMA datum
      if (this.settings.oma){

        if (this.settings.type_chromosome === 'extant') {

          var xhr3 = new XMLHttpRequest();
          xhr3.open("GET", "/api/protein/"+ d.id +"/", false); // false makes the request synchronous
          xhr3.send(null);

          if (xhr3.status === 200) {
            const data = JSON.parse(xhr3.responseText);

            this.menuContent.push({type: 'text', content: '<b>External Id:</b>' + data.canonicalid  , click:null, style: null})
            this.menuContent.push({type: 'text', content: '<b>Sequence length:</b>' + data.sequence_length , click:null, style: null})

          }


        }
        else if (this.settings.type_chromosome === 'ancestral') {

          var level_api = this.settings.level ? '?level=' + this.settings.level : ''


            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/api/hog/"+ d.id +"/" + level_api, false); // false makes the request synchronous
            xhr.send(null);

            if (xhr.status === 200) {
              const data = JSON.parse(xhr.responseText);

              this.menuContent.push({type: 'text', content: '<b>Description:</b>' + data[0].description , click:null, style: null})


            }


        }
      }

      // Display additional data metrics
      if (this.settings.data_metrics.categorical) {
        for (const key of Object.keys(this.settings.data_metrics.categorical)) {

          this.menuContent.push( {type: 'text', content: `<span ><b>${key}:</b> ${d.data[key]}</span>` , click:null, style: null})


        }
      }

      if (this.settings.data_metrics.numerical) {
        for (const key of Object.keys(this.settings.data_metrics.numerical)) {
          this.menuContent.push( {type: 'text', content:`<span><b>${key}:</b> ${d.data[key]}</span>` , click:null, style: null})

        }
      }

      // add Action button
      if (this.settings.oma) {

        if (this.settings.type_chromosome === 'extant') {

          this.menuContent.push({class: 'btn btn-sm btn-outline-dark', content: 'Open Local Synteny' , click:() => {this.callback_click_synteny(d.id) }, style: 'margin: 8px;text-align: center'})
          this.menuContent.push({class: 'btn btn-sm btn-outline-dark', content: 'Open Gene details' , click:() => {this.callback_click_detail(d.id) }, style: 'margin: 8px;text-align: center'})

        }


        else if (this.settings.type_chromosome === 'ancestral') {

          this.menuContent.push({class: 'btn btn-sm btn-outline-dark', content: 'Open Local Synteny' , click:() => {this.callback_click_synteny(d.id) }, style: 'margin: 8px; text-align: center'})
          this.menuContent.push({class: 'btn btn-sm btn-outline-dark', content: 'Open Gene details' , click:() => {this.callback_click_detail(d.id) }, style: 'margin: 8px;text-align: center'})
          this.menuContent.push( {class: 'btn btn-sm btn-outline-dark', content:`Open HOG members` , click: () => {this.callback_click_members(d.id) }, style: 'margin: 8px;text-align: center'})

        }

      }

      // add GOA section
      if (this.settings.oma) {

        const url = this.settings.type_chromosome === 'ancestral' ? "/api/hog/" + d.id + "/gene_ontology/" + level_api : "/api/protein/" + d.id + "/gene_ontology/"

        var xhr2 = new XMLHttpRequest();
        xhr2.open("GET", url, false); // false makes the request synchronous
        xhr2.send(null);

        if (xhr2.status === 200) {
          const data_annotation = JSON.parse(xhr2.responseText);

          this.menuContent.push( {type: 'text', content:` <hr style="margin-top: 0.1em; margin-bottom: 0.2em"> <b>GO annotations</b>  <hr style="margin-top: 0.1em; margin-bottom: 0.2em">`, click:null, style: null})

          const goa = this.process_annotation(data_annotation)

          var add_annotation_by_aspect = (array_aspect, text) => {
            var sbio = Array.from(array_aspect).sort(function (a, b) {
              return parseFloat(b.score) - parseFloat(a.score);
            })
            this.menuContent.push( {type: 'text', content:'<b> ' + text + ' </b>: ' , click:null, style: null})

            for (var sbioKey in sbio) {
              let go = sbio[sbioKey]
              this.menuContent.push( {type: 'text', content:'<b> - ' + go.GO_term + '</b>: ' + go.name  , click:null, style: null})
            }
          }

          add_annotation_by_aspect(goa.bio, 'Biological Process')
          add_annotation_by_aspect(goa.cell, 'Cellular Component')
          add_annotation_by_aspect(goa.mol, 'Molecular Function')


        }
      }


      this.menuVisible = true;



    },
    get_selected_genes() {
      return this.datum.nodes.filter(d => this.isInSelectedRegion(d));
    },
    process_annotation(data_annotation){

      var ann_proc = {
        'bio': new Set(),
        'cell': new Set(),
        'mol': new Set()
      }

    for (const contentKey in data_annotation) {

        var go = data_annotation[contentKey]

        switch (go.aspect) {

          case "cellular_component":
            ann_proc.cell.add(go);
            break;
          case 'biological_process':
            ann_proc.bio.add(go);
            break;
          case 'molecular_function':
            ann_proc.mol.add(go);
            break;
          default:
            console.log(`${go.aspect} not recognise as annotation category.`);

        }

      }

    return ann_proc
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

    // UTILS
    pretty_locus(l) {
      return d3.format(",.9r")(parseInt(l))
    },
    isInSelectedRegion(d) {
      return this.datum.selectedRegions.some(([x0, x1]) => this.d_start(d) >= x0 && this.d_end(d) <= x1);
    },
    set_anchor_position(d) {

      // THIS function is used to set the anchor position of the text for mapper

      var [min, max] = this.get_min_max()
      var scale = d3.scaleLinear().clamp(true).domain([0, this.domain_max]).range([0, this.CurrentWidth]);
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
    get_x1_edge(scale, d, i) {
      return scale(this.d_start(d)) - (scale(this.d_start(d)) - scale(this.d_end(this.datum.nodes[i]))) / 2
    },
    getCurrentWidth() {
      return (this.parentWidth * (this.domain_max_current / this.domain_max))
    },

    // EVENTS
    emitEvent(eventType, payload = null) {
      this.$emit('chromosome-event', {eventType, payload});
    },


  },
  mounted() {
    this.parentWidth = this.$refs['interface_chr_small_container'].offsetWidth - (window.innerWidth * 0.04);
    this.CurrentWidth = this.getCurrentWidth()
    this.render_excerpt();
    this.render_mapper();
    this.render_overview();

  },
  data() {
    return {
      CurrentWidth: null,
      parentWidth: null,
      margin_top_svg: 0,
      menuVisible: false,
      menuPosition: {x: 0, y: 0},
      menuContent: [],
      color_scheme: this.settings.color_scheme_list[this.settings.color_scheme]
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
}

#chromosome_name {
  margin-right: 8px;
  text-align: left;
  font-weight: bold;
  color: rgb(99,99,102);
}

#chromosome_genes_desc {
  text-align: left;
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

.close-button {
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
}



</style>
