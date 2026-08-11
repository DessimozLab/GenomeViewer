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
    'settings.colorAccessor': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
    'settings.heightAccessor': {
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
    'settings.color_scheme_edge': {
      handler: function () {
        this.color_scheme_edge = this.settings.color_scheme_list[this.settings.color_scheme_edge]
        this.update_renders()
      },
      deep: true
    },
    'settings.colorAccessor_edge': {
      handler: function () {
        this.update_renders()
      },
      deep: true,
    },
  },
  computed: {
    // SCALE
    color_scale() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .clamp(true)
          .interpolator(this.color_scheme);
    },
    color_scale_edge() {
      const extent = this.settings.data_metrics.numerical[this.settings.colorAccessor_edge]
      return d3.scaleSequential()
          .domain([extent.min, extent.max])
          .clamp(true)
          .interpolator(this.color_scheme_edge);
    },

    // GETTER
    domain_max_current() {
      // must use d_end, not the raw start/index field, or the rightmost gene's start pins the
      // domain max and it collapses to zero width on screen (invisible)
      return Math.max(...this.datum.nodes.map(d => this.d_end(d)))
    },
    domain_min_current() {
      return Math.min(...this.datum.nodes.map(d => this.d_start(d)))
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
    show_direction_triangles() {
      return !!(this.settings.data_metrics.categorical && this.settings.data_metrics.categorical['strand']);
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
    applyDefaultExcerptZoom() {
      // only kicks in on first mount, while currentZoom is still untouched by the user
      if (this.datum.currentZoom.k !== 1 || this.datum.currentZoom.x !== 0) {
        return
      }

      const windowSize = this.settings.default_excerpt_window_genes
      if (!windowSize || this.datum.nodes.length <= windowSize) {
        return
      }

      const mid = Math.floor(this.datum.nodes.length / 2)
      const half = Math.floor(windowSize / 2)
      const startIdx = Math.max(0, mid - half)
      const endIdx = Math.min(this.datum.nodes.length - 1, startIdx + windowSize - 1)

      const scale = d3.scaleLinear().domain([this.domain_min_current, this.domain_max_current]).range([0, this.parentWidth])
      const x0 = scale(this.d_start(this.datum.nodes[startIdx]))
      const x1 = scale(this.d_end(this.datum.nodes[endIdx]))

      if (x1 <= x0) {
        return
      }

      const k = this.parentWidth / (x1 - x0)
      this.emitEvent('updateZoom', d3.zoomIdentity.scale(k).translate(-x0, 0))
    },
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
                  .attr('id', d => d.id)
                  .attr('opacity', 0.8)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr("fill", this.color_gene_overview)
                  .attr('transform', d => {
                    if (this.settings.heightAccessor == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor])
                      return `translate( 0,${y})`
                    }
                  }),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', 0)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr('transform', d => {
                    if (this.settings.heightAccessor == null) {
                      return 'translate(0, 0)'
                    } else {
                      var y = this.settings.svgHeight_overview - scale_height(d.data[this.settings.heightAccessor])
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
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr('opacity', 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              update => update // For updated data, update the existing rectangles
                  .attr('x', d => scale(this.d_start(d)))
                  .attr('y', this.margin_top_svg)
                  .attr('width', d => scale(this.d_end(d)) - scale(this.d_start(d)))
                  .attr('height', d => {
                    return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
                  })
                  .attr('opacity', 0.8)
                  .on('click', (event, d) => this.showMenu(event, d))
                  .attr('transform', d => this.gene_vertical_transform(scale_height, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              exit => exit.remove() // For outgoing data, remove the rectangles
          );

      svg_excerpt.selectAll('.line_between_right')
          .data(this.datum.nodes.slice(0, this.datum.nodes.length - 1))
          .join(
              enter => enter.append('line')
                  .attr('class', 'line_between_right')
                  .attr('x1', (d) => scale(this.d_end(d)))
                  .attr('y1', this.settings.svgHeight / 2)
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i + 1])))
                  .attr('y2',this.settings.svgHeight / 2)
                  .attr('stroke', d =>  this.color_edge_excerpt(d))
                  .attr('stroke-width', this.settings.edge_height),
              update => update
                  .attr('x1', (d) => scale(this.d_end(d)))
                  .attr('x2', (d,i) => scale(this.d_start(this.datum.nodes[i + 1])))
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

      // painted last so the direction arrows stay in front of the gene rects and the edge lines
      svg_excerpt.selectAll('.gene_direction_triangle')
          .data(this.show_direction_triangles ? this.datum.nodes.filter(d => d.data.strand === '+' || d.data.strand === '-') : [])
          .join(
              enter => enter.append('path')
                  .attr('class', 'gene_direction_triangle')
                  .attr('d', d => this.direction_triangle_path(scale, scale_height, d))
                  .attr('transform', d => this.direction_triangle_transform(scale, scale_height, d))
                  .attr('opacity', d => this.direction_triangle_opacity(scale, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              update => update
                  .attr('d', d => this.direction_triangle_path(scale, scale_height, d))
                  .attr('transform', d => this.direction_triangle_transform(scale, scale_height, d))
                  .attr('opacity', d => this.direction_triangle_opacity(scale, d))
                  .attr('fill', d => this.color_gene_excerpt(d)),
              exit => exit.remove()
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

        svg_excerpt.selectAll('.gene_direction_triangle')
            .attr('d', d => this.direction_triangle_path(newScale, scale_height, d))
            .attr('transform', d => this.direction_triangle_transform(newScale, scale_height, d))
            .attr('opacity', d => this.direction_triangle_opacity(newScale, d));

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

      if (this.settings.colorAccessor === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale(d.data[this.settings.colorAccessor])

    },
    set_height_gene_overview_scale() {

      if (this.settings.heightAccessor === null) {
        return this.settings.svgHeight_overview;
      } else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor]
        return d3.scaleLinear().clamp(true).domain([extent.min, extent.max]).range([0, this.settings.svgHeight_overview]);
      }

    },
    color_gene_excerpt(d) {


      if (this.settings.searchQueriesIds.includes(d.id)) {
        return 'red';
      }

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale(d.data[this.settings.colorAccessor])

    },
    color_edge_excerpt(d) {

      if (this.isInSelectedRegion(d)) {
        return this.settings.selected_gene_color
      }

      if (this.settings.colorAccessor_edge === null) {
        return this.settings.defaut_gene_color
      }

      return this.color_scale_edge(d.data[this.settings.colorAccessor_edge])

    },
    gene_height_excerpt(scale_height, d) {
      return this.settings.heightAccessor == null ? scale_height : scale_height(d.data[this.settings.heightAccessor])
    },
    gene_vertical_transform(scale_height, d) {
      // centers the gene (and its direction triangle, via the same formula) on the edge line at svgHeight/2,
      // rather than anchoring it to the bottom of the excerpt
      if (this.settings.heightAccessor == null) {
        return 'translate(0, 0)'
      }
      const height = this.gene_height_excerpt(scale_height, d)
      const y = (this.settings.svgHeight - height) / 2
      return `translate(0, ${y})`
    },
    gene_width_excerpt(scale, d) {
      return scale(this.d_end(d)) - scale(this.d_start(d))
    },
    direction_triangle_glyph_width(scale, d) {
      // scales up with the gene's on-screen width so the arrow stays readable once zoomed in,
      // but never shrinks below the baseline or grows past the cap for very wide genes
      const width = this.gene_width_excerpt(scale, d) * this.direction_triangle_width_ratio
      return Math.min(this.max_direction_triangle_width, Math.max(this.min_direction_triangle_width, width))
    },
    direction_triangle_path(scale, scale_height, d) {
      // a triangle pointing right, flush against local x=0; translate/mirror in the transform
      // positions and orients it per-gene without ever having to recompute this path on zoom
      const height = this.gene_height_excerpt(scale_height, d)
      const width = this.direction_triangle_glyph_width(scale, d)
      return `M0,0 L0,${height} L${width},${height / 2} Z`
    },
    direction_triangle_transform(scale, scale_height, d) {
      // same vertical anchor as the gene rect (gene_vertical_transform) so the triangle and its
      // gene box always stay aligned, only expressed as an absolute y instead of a translate delta
      const height = this.gene_height_excerpt(scale_height, d)
      const ty = this.settings.heightAccessor == null ? 0 : (this.settings.svgHeight - height) / 2
      if (d.data.strand === '-') {
        return `translate(${scale(this.d_start(d))}, ${ty}) scale(-1,1)`
      }
      return `translate(${scale(this.d_end(d))}, ${ty})`
    },
    direction_triangle_opacity(scale, d) {
      // hide the triangle once the gene itself is too narrow on screen to draw it legibly;
      // 0.8 matches the gene rect's own opacity so the arrow doesn't look more solid than its gene
      return this.gene_width_excerpt(scale, d) >= this.min_gene_width_for_direction ? 0.8 : 0
    },
    set_height_gene_excerpt_scale() {

      if (this.settings.heightAccessor === null) {
        return this.settings.svgHeight;
      }

      else {
        const extent = this.settings.data_metrics.numerical[this.settings.heightAccessor]
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

      // Display additional data metrics, grouped into "Gene" (incl. start/end position)
      // and "Edge" sections, each sorted alphabetically for easier reading
      const addSectionHeader = (title) => {
        this.menuContent.push({type: 'text', content: `<hr style="margin-top: 0.1em; margin-bottom: 0.2em"> <b>${title}</b> <hr style="margin-top: 0.1em; margin-bottom: 0.2em">`, click:null, style: null})
      }

      const geneKeys = new Set()
      const edgeKeys = new Set()

      const collectKeys = (metrics) => {
        if (!metrics) return
        for (const key of Object.keys(metrics)) {
          if (key.endsWith('_edge')) {
            edgeKeys.add(key)
          } else {
            geneKeys.add(key)
          }
        }
      }

      collectKeys(this.settings.data_metrics.categorical)
      collectKeys(this.settings.data_metrics.numerical)

      addSectionHeader('Gene')

      if (this.datum.type === 'extant') {
        this.menuContent.push({type: 'text', content: `<span><b>Start:</b> ${this.pretty_locus(d.start)}</span>`, click:null, style: null})
        this.menuContent.push({type: 'text', content: `<span><b>End:</b> ${this.pretty_locus(d.end)}</span>`, click:null, style: null})
      }

      Array.from(geneKeys).sort((a, b) => a.localeCompare(b)).forEach(key => {
        this.menuContent.push({type: 'text', content: `<span><b>${key}:</b> ${d.data[key]}</span>`, click:null, style: null})
      })

      if (edgeKeys.size > 0) {
        addSectionHeader('Edge')

        Array.from(edgeKeys).sort((a, b) => a.localeCompare(b)).forEach(key => {
          const label = key.slice(0, -'_edge'.length)
          this.menuContent.push({type: 'text', content: `<span><b>${label}:</b> ${d.data[key]}</span>`, click:null, style: null})
        })
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
            if (![...ann_proc.cell].some(item => item.GO_term === go.GO_term)) {
              ann_proc.cell.add(go);
            }
            break;
          case 'biological_process':
            if (![...ann_proc.bio].some(item => item.GO_term === go.GO_term)) {
              ann_proc.bio.add(go);
            }
            break;
          case 'molecular_function':
            if (![...ann_proc.mol].some(item => item.GO_term === go.GO_term)) {
              ann_proc.mol.add(go);
            }
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
      return d3.format(",d")(Math.round(l))
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
    this.applyDefaultExcerptZoom()
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
      color_scheme: this.settings.color_scheme_list[this.settings.color_scheme],
      color_scheme_edge: this.settings.color_scheme_list[this.settings.color_scheme_edge],
      min_direction_triangle_width: 5,
      max_direction_triangle_width: 10,
      direction_triangle_width_ratio: 0.2,
      min_gene_width_for_direction: 18,
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
