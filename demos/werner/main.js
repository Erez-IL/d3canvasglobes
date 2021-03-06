/* set up environment with require.js */

require.config({
	baseUrl: "../../js/", // otherwise same as ../js/main.js
	paths: {
		d3: "external/d3.min",
		topojson: "external/topojson",
		// projections addon
		d3projection:  "external/d3.geo.projection.v0",
		wernerprojection:  "d3.geo.projection.werner",
		cgd3: "../cgd3"
	}
});

require(["d3", "topojson", "helpers"],
function (d3, topojson) {
	require(["d3projection"], function (d3) {
		require(["wernerprojection"], function () {
			require(["cgd3"], function (cgd3) {
				require(["../demos/werner/werner"], function () {});
			});
		});
	});
});