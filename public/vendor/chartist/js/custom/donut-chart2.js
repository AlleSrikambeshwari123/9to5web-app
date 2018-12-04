new Chartist.Pie('.donut-chart-1', {
  series: [985, 476, 670,450,212,657]
}, {
	donut: true,
	donutWidth: 6,
	donutSolid: true,
	startAngle: 270,
	showLabel: false,
	height: "130px",
	plugins: [
		Chartist.plugins.tooltip()
	],
	low: 0
});