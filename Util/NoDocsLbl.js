'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fonts = {
    Courier: {
        normal: 'Courier',
        bold: 'Courier-Bold',
        italics: 'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique'
    },
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    },
    Times: {
        normal: 'Times-Roman',
        bold: 'Times-Bold',
        italics: 'Times-Italic',
        bolditalics: 'Times-BoldItalic'
    },
    Symbol: {
        normal: 'Symbol'
    },
    ZapfDingbats: {
        normal: 'ZapfDingbats'
    }
};
var pdffonts = require('pdfmake/build/vfs_fonts');
var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);
var moment = require('moment');
var fs = require('fs');
//   const userDataPath = (electron.app || electron.remote.app).getPath('userData');

var LBLNoDocs = exports.LBLNoDocs = function () {
    function LBLNoDocs() {
        _classCallCheck(this, LBLNoDocs);

        this.companies = {
            nineTofive: {
                logo: 'public/img/pbe-logo.png',
                name: "NINE TO FIVE IMPORT EXPORT"
            },
            postBoxes: {
                logo: 'public/img/pbe-logo.png',
                name: "POST BOXES ETC"
            }
        };
    }

    _createClass(LBLNoDocs, [{
        key: 'printNoDocsLabel',
        value: function printNoDocsLabel(awb, fees) {
            var srv = this;
            srv.awb = awb.awb;
            if (!fees.express) fees.express = 0;

            var company = this.companies.nineTofive;
            console.log("awb", awb, "customer", srv.awb.customer);
            if (Number(srv.awb.customer.pmb) >= 9000) {
                company = this.companies.nineTofive;
            } else if (srv.awb.customer.pmb == "") {
                srv.awb.customer.pmb = 9000;
                company = this.companies.nineTofive;
            } else company = this.companies.postBoxes;
            return new Promise(function (resolve, reject) {
                var _ref2, _ref3, _ref4;

                var dd = {
                    pageSize: {
                        width: 288.00,
                        height: 216.00
                    },
                    pageOrientation: 'portrait',
                    pageMargins: [2, 5, 2, 2],
                    content: [{
                        width: '*',
                        stack: [{ margin: [5, 5], image: company.logo, alignment: 'center', width: 100 }, _defineProperty({ margin: [5, 10], text: "No Docs Package            " + srv.awb.id, alignment: 'left', bold: true, fontSize: 11 }, 'margin', [1, 1]), { text: "Customer", bold: true, alignment: 'left', fontSize: 9, margin: [2, 10, 2, 1] }, { text: '' + srv.awb.customer.name, bold: true, alignment: 'left', fontSize: 8, margin: [2, 2] }, { text: 'Vendor', alignment: 'left', fontSize: 9, bold: true, margin: [2, 10, 2, 1] }, { text: '' + srv.awb.shipper, alignment: 'left', fontSize: 9, bold: true, margin: [2, 2] }, (_ref2 = { text: 'Ref No', bold: true, alignment: 'left', fontSize: 9 }, _defineProperty(_ref2, 'bold', true), _defineProperty(_ref2, 'margin', [2, 10, 2, 1]), _ref2), (_ref3 = { text: '1100', bold: true, alignment: 'left', fontSize: 9 }, _defineProperty(_ref3, 'bold', true), _defineProperty(_ref3, 'margin', [2, 2]), _ref3), (_ref4 = { text: '' + moment().format("MM/DD/YY hh:mm A"), bold: true, alignment: 'left', fontSize: 9 }, _defineProperty(_ref4, 'bold', true), _defineProperty(_ref4, 'margin', [2, 10]), _ref4)]

                    }],
                    defaultStyle: {
                        font: 'Helvetica',
                        fontSize: 8
                    }
                };
                var filename = srv.awb.id + '' + '-no-doc.pdf';
                var pdfDoc = printer.createPdfKitDocument(dd);
                pdfDoc.pipe(fs.createWriteStream(filename));
                pdfDoc.end();
                resolve({ generated: true, filename: filename });
            });
        }
    }]);

    return LBLNoDocs;
}();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIlV0aWwvTm9Eb2NzTGJsLmVzNiJdLCJuYW1lcyI6WyJmb250cyIsIkNvdXJpZXIiLCJub3JtYWwiLCJib2xkIiwiaXRhbGljcyIsImJvbGRpdGFsaWNzIiwiSGVsdmV0aWNhIiwiVGltZXMiLCJTeW1ib2wiLCJaYXBmRGluZ2JhdHMiLCJwZGZmb250cyIsInJlcXVpcmUiLCJQZGZQcmludGVyIiwicHJpbnRlciIsIm1vbWVudCIsImZzIiwiTEJMTm9Eb2NzIiwiY29tcGFuaWVzIiwibmluZVRvZml2ZSIsImxvZ28iLCJuYW1lIiwicG9zdEJveGVzIiwiYXdiIiwiZmVlcyIsInNydiIsImV4cHJlc3MiLCJjb21wYW55IiwiY29uc29sZSIsImxvZyIsImN1c3RvbWVyIiwiTnVtYmVyIiwicG1iIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJkZCIsInBhZ2VTaXplIiwid2lkdGgiLCJoZWlnaHQiLCJwYWdlT3JpZW50YXRpb24iLCJwYWdlTWFyZ2lucyIsImNvbnRlbnQiLCJzdGFjayIsIm1hcmdpbiIsImltYWdlIiwiYWxpZ25tZW50IiwidGV4dCIsImlkIiwiZm9udFNpemUiLCJzaGlwcGVyIiwiZm9ybWF0IiwiZGVmYXVsdFN0eWxlIiwiZm9udCIsImZpbGVuYW1lIiwicGRmRG9jIiwiY3JlYXRlUGRmS2l0RG9jdW1lbnQiLCJwaXBlIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJlbmQiLCJnZW5lcmF0ZWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUVDLElBQUlBLFFBQVE7QUFDVEMsYUFBUztBQUNQQyxnQkFBUSxTQUREO0FBRVBDLGNBQU0sY0FGQztBQUdQQyxpQkFBUyxpQkFIRjtBQUlQQyxxQkFBYTtBQUpOLEtBREE7QUFPVEMsZUFBVztBQUNUSixnQkFBUSxXQURDO0FBRVRDLGNBQU0sZ0JBRkc7QUFHVEMsaUJBQVMsbUJBSEE7QUFJVEMscUJBQWE7QUFKSixLQVBGO0FBYVRFLFdBQU87QUFDTEwsZ0JBQVEsYUFESDtBQUVMQyxjQUFNLFlBRkQ7QUFHTEMsaUJBQVMsY0FISjtBQUlMQyxxQkFBYTtBQUpSLEtBYkU7QUFtQlRHLFlBQVE7QUFDTk4sZ0JBQVE7QUFERixLQW5CQztBQXNCVE8sa0JBQWM7QUFDWlAsZ0JBQVE7QUFESTtBQXRCTCxDQUFaO0FBMEJDLElBQUlRLFdBQVdDLFFBQVEseUJBQVIsQ0FBZjtBQUNELElBQUlDLGFBQWFELFFBQVEsU0FBUixDQUFqQjtBQUNDLElBQUlFLFVBQVUsSUFBSUQsVUFBSixDQUFlWixLQUFmLENBQWQ7QUFDQSxJQUFJYyxTQUFTSCxRQUFRLFFBQVIsQ0FBYjtBQUNBLElBQUlJLEtBQUtKLFFBQVEsSUFBUixDQUFUO0FBQ0Y7O0lBQ2FLLFMsV0FBQUEsUztBQUVULHlCQUFhO0FBQUE7O0FBQ1QsYUFBS0MsU0FBTCxHQUFpQjtBQUNaQyx3QkFBWTtBQUNUQyxzQkFBSyx5QkFESTtBQUVUQyxzQkFBTTtBQUZHLGFBREE7QUFLYkMsdUJBQVc7QUFDUEYsc0JBQUsseUJBREU7QUFFUEMsc0JBQU87QUFGQTtBQUxFLFNBQWpCO0FBVUg7Ozs7eUNBQ2dCRSxHLEVBQUlDLEksRUFBSztBQUN0QixnQkFBSUMsTUFBTSxJQUFWO0FBQ0FBLGdCQUFJRixHQUFKLEdBQVVBLElBQUlBLEdBQWQ7QUFDQSxnQkFBSSxDQUFDQyxLQUFLRSxPQUFWLEVBQ0lGLEtBQUtFLE9BQUwsR0FBZSxDQUFmOztBQUdBLGdCQUFJQyxVQUFXLEtBQUtULFNBQUwsQ0FBZUMsVUFBOUI7QUFDQVMsb0JBQVFDLEdBQVIsQ0FBWSxLQUFaLEVBQWtCTixHQUFsQixFQUFzQixVQUF0QixFQUFpQ0UsSUFBSUYsR0FBSixDQUFRTyxRQUF6QztBQUNBLGdCQUFJQyxPQUFPTixJQUFJRixHQUFKLENBQVFPLFFBQVIsQ0FBaUJFLEdBQXhCLEtBQThCLElBQWxDLEVBQXVDO0FBQ25DTCwwQkFBVSxLQUFLVCxTQUFMLENBQWVDLFVBQXpCO0FBQ0gsYUFGRCxNQUdLLElBQUlNLElBQUlGLEdBQUosQ0FBUU8sUUFBUixDQUFpQkUsR0FBakIsSUFBdUIsRUFBM0IsRUFDTDtBQUNJUCxvQkFBSUYsR0FBSixDQUFRTyxRQUFSLENBQWlCRSxHQUFqQixHQUF1QixJQUF2QjtBQUNBTCwwQkFBVSxLQUFLVCxTQUFMLENBQWVDLFVBQXpCO0FBQ0gsYUFKSSxNQUtBUSxVQUFVLEtBQUtULFNBQUwsQ0FBZUksU0FBekI7QUFDVCxtQkFBTyxJQUFJVyxPQUFKLENBQWEsVUFBQ0MsT0FBRCxFQUFTQyxNQUFULEVBQWtCO0FBQUE7O0FBQ2xDLG9CQUFJQyxLQUFLO0FBQ0xDLDhCQUFVO0FBQ05DLCtCQUFPLE1BREQ7QUFFTkMsZ0NBQVE7QUFGRixxQkFETDtBQUtIQyxxQ0FBaUIsVUFMZDtBQU1IQyxpQ0FBYSxDQUFFLENBQUYsRUFBSyxDQUFMLEVBQVEsQ0FBUixFQUFXLENBQVgsQ0FOVjtBQU9MQyw2QkFBUyxDQUNKO0FBQ0lKLCtCQUFNLEdBRFY7QUFFSUssK0JBQU0sQ0FDSCxFQUFDQyxRQUFPLENBQUMsQ0FBRCxFQUFHLENBQUgsQ0FBUixFQUFjQyxPQUFNbEIsUUFBUVAsSUFBNUIsRUFBa0MwQixXQUFVLFFBQTVDLEVBQXFEUixPQUFNLEdBQTNELEVBREcsb0JBRUZNLFFBQU8sQ0FBQyxDQUFELEVBQUcsRUFBSCxDQUZMLEVBRVlHLE1BQUssZ0NBQThCdEIsSUFBSUYsR0FBSixDQUFReUIsRUFGdkQsRUFFMERGLFdBQVUsTUFGcEUsRUFFMkUxQyxNQUFLLElBRmhGLEVBRXFGNkMsVUFBUyxFQUY5RixjQUV3RyxDQUFDLENBQUQsRUFBRyxDQUFILENBRnhHLEdBR0gsRUFBQ0YsTUFBSyxVQUFOLEVBQWlCM0MsTUFBSyxJQUF0QixFQUEyQjBDLFdBQVUsTUFBckMsRUFBNENHLFVBQVMsQ0FBckQsRUFBdURMLFFBQU8sQ0FBQyxDQUFELEVBQUcsRUFBSCxFQUFNLENBQU4sRUFBUSxDQUFSLENBQTlELEVBSEcsRUFJSCxFQUFDRyxXQUFRdEIsSUFBSUYsR0FBSixDQUFRTyxRQUFSLENBQWlCVCxJQUExQixFQUFrQ2pCLE1BQUssSUFBdkMsRUFBNEMwQyxXQUFVLE1BQXRELEVBQTZERyxVQUFTLENBQXRFLEVBQXdFTCxRQUFPLENBQUMsQ0FBRCxFQUFHLENBQUgsQ0FBL0UsRUFKRyxFQUtILEVBQUNHLGNBQUQsRUFBZUQsV0FBVSxNQUF6QixFQUFnQ0csVUFBUyxDQUF6QyxFQUEyQzdDLE1BQUssSUFBaEQsRUFBcUR3QyxRQUFPLENBQUMsQ0FBRCxFQUFHLEVBQUgsRUFBTSxDQUFOLEVBQVEsQ0FBUixDQUE1RCxFQUxHLEVBTUgsRUFBQ0csV0FBUXRCLElBQUlGLEdBQUosQ0FBUTJCLE9BQWpCLEVBQTJCSixXQUFVLE1BQXJDLEVBQTRDRyxVQUFTLENBQXJELEVBQXVEN0MsTUFBSyxJQUE1RCxFQUFpRXdDLFFBQU8sQ0FBQyxDQUFELEVBQUcsQ0FBSCxDQUF4RSxFQU5HLGFBT0ZHLGNBUEUsRUFPWTNDLE1BQUssSUFQakIsRUFPdUIwQyxXQUFVLE1BUGpDLEVBT3dDRyxVQUFTLENBUGpELG1DQU93RCxJQVB4RCxvQ0FPb0UsQ0FBQyxDQUFELEVBQUcsRUFBSCxFQUFNLENBQU4sRUFBUSxDQUFSLENBUHBFLHNCQVFGRixZQVJFLEVBUVUzQyxNQUFLLElBUmYsRUFRcUIwQyxXQUFVLE1BUi9CLEVBUXNDRyxVQUFTLENBUi9DLG1DQVFzRCxJQVJ0RCxvQ0FRa0UsQ0FBQyxDQUFELEVBQUcsQ0FBSCxDQVJsRSxzQkFTRkYsV0FBUWhDLFNBQVNvQyxNQUFULENBQWdCLGtCQUFoQixDQVROLEVBUzRDL0MsTUFBSyxJQVRqRCxFQVN1RDBDLFdBQVUsTUFUakUsRUFTd0VHLFVBQVMsQ0FUakYsbUNBU3dGLElBVHhGLG9DQVNvRyxDQUFDLENBQUQsRUFBRyxFQUFILENBVHBHOztBQUZWLHFCQURJLENBUEo7QUE2QkxHLGtDQUFjO0FBQ1ZDLDhCQUFNLFdBREk7QUFFVkosa0NBQVM7QUFGQztBQTdCVCxpQkFBVDtBQWtDQSxvQkFBSUssV0FBWTdCLElBQUlGLEdBQUosQ0FBUXlCLEVBQVIsR0FBVyxFQUFYLEdBQWMsYUFBOUI7QUFDQSxvQkFBSU8sU0FBU3pDLFFBQVEwQyxvQkFBUixDQUE2QnBCLEVBQTdCLENBQWI7QUFDQW1CLHVCQUFPRSxJQUFQLENBQVl6QyxHQUFHMEMsaUJBQUgsQ0FBcUJKLFFBQXJCLENBQVo7QUFDQUMsdUJBQU9JLEdBQVA7QUFDQXpCLHdCQUFRLEVBQUMwQixXQUFVLElBQVgsRUFBZ0JOLFVBQVNBLFFBQXpCLEVBQVI7QUFDSCxhQXhDTSxDQUFQO0FBeUNIIiwiZmlsZSI6IlV0aWwvTm9Eb2NzTGJsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5cbiB2YXIgZm9udHMgPSB7XG4gICAgQ291cmllcjoge1xuICAgICAgbm9ybWFsOiAnQ291cmllcicsXG4gICAgICBib2xkOiAnQ291cmllci1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdDb3VyaWVyLU9ibGlxdWUnLFxuICAgICAgYm9sZGl0YWxpY3M6ICdDb3VyaWVyLUJvbGRPYmxpcXVlJ1xuICAgIH0sXG4gICAgSGVsdmV0aWNhOiB7XG4gICAgICBub3JtYWw6ICdIZWx2ZXRpY2EnLFxuICAgICAgYm9sZDogJ0hlbHZldGljYS1Cb2xkJyxcbiAgICAgIGl0YWxpY3M6ICdIZWx2ZXRpY2EtT2JsaXF1ZScsXG4gICAgICBib2xkaXRhbGljczogJ0hlbHZldGljYS1Cb2xkT2JsaXF1ZSdcbiAgICB9LFxuICAgIFRpbWVzOiB7XG4gICAgICBub3JtYWw6ICdUaW1lcy1Sb21hbicsXG4gICAgICBib2xkOiAnVGltZXMtQm9sZCcsXG4gICAgICBpdGFsaWNzOiAnVGltZXMtSXRhbGljJyxcbiAgICAgIGJvbGRpdGFsaWNzOiAnVGltZXMtQm9sZEl0YWxpYydcbiAgICB9LFxuICAgIFN5bWJvbDoge1xuICAgICAgbm9ybWFsOiAnU3ltYm9sJ1xuICAgIH0sXG4gICAgWmFwZkRpbmdiYXRzOiB7XG4gICAgICBub3JtYWw6ICdaYXBmRGluZ2JhdHMnXG4gICAgfVxuICB9O1xuICB2YXIgcGRmZm9udHMgPSByZXF1aXJlKCdwZGZtYWtlL2J1aWxkL3Zmc19mb250cycpXG4gdmFyIFBkZlByaW50ZXIgPSByZXF1aXJlKCdwZGZtYWtlJyk7XG4gIHZhciBwcmludGVyID0gbmV3IFBkZlByaW50ZXIoZm9udHMpO1xuICB2YXIgbW9tZW50ID0gcmVxdWlyZSgnbW9tZW50JylcbiAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbi8vICAgY29uc3QgdXNlckRhdGFQYXRoID0gKGVsZWN0cm9uLmFwcCB8fCBlbGVjdHJvbi5yZW1vdGUuYXBwKS5nZXRQYXRoKCd1c2VyRGF0YScpO1xuZXhwb3J0IGNsYXNzIExCTE5vRG9jc3tcbiAgICBcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLmNvbXBhbmllcyA9IHtcbiAgICAgICAgICAgICBuaW5lVG9maXZlOiB7XG4gICAgICAgICAgICAgICAgbG9nbzoncHVibGljL2ltZy9wYmUtbG9nby5wbmcnLFxuICAgICAgICAgICAgICAgIG5hbWU6IFwiTklORSBUTyBGSVZFIElNUE9SVCBFWFBPUlRcIlxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICBwb3N0Qm94ZXM6IHtcbiAgICAgICAgICAgICAgICBsb2dvOidwdWJsaWMvaW1nL3BiZS1sb2dvLnBuZycsIFxuICAgICAgICAgICAgICAgIG5hbWUgOiBcIlBPU1QgQk9YRVMgRVRDXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBwcmludE5vRG9jc0xhYmVsKGF3YixmZWVzKXtcbiAgICAgICAgdmFyIHNydiA9IHRoaXM7IFxuICAgICAgICBzcnYuYXdiID0gYXdiLmF3YjsgXG4gICAgICAgIGlmICghZmVlcy5leHByZXNzKVxuICAgICAgICAgICAgZmVlcy5leHByZXNzID0gMDsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbXBhbnkgID0gdGhpcy5jb21wYW5pZXMubmluZVRvZml2ZTsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImF3YlwiLGF3YixcImN1c3RvbWVyXCIsc3J2LmF3Yi5jdXN0b21lcilcbiAgICAgICAgICAgIGlmIChOdW1iZXIoc3J2LmF3Yi5jdXN0b21lci5wbWIpPj05MDAwKXtcbiAgICAgICAgICAgICAgICBjb21wYW55ID0gdGhpcy5jb21wYW5pZXMubmluZVRvZml2ZTsgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzcnYuYXdiLmN1c3RvbWVyLnBtYiA9PVwiXCIpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3J2LmF3Yi5jdXN0b21lci5wbWIgPSA5MDAwO1xuICAgICAgICAgICAgICAgIGNvbXBhbnkgPSB0aGlzLmNvbXBhbmllcy5uaW5lVG9maXZlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBjb21wYW55ID0gdGhpcy5jb21wYW5pZXMucG9zdEJveGVzXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSAoKHJlc29sdmUscmVqZWN0KT0+e1xuICAgICAgICAgICAgdmFyIGRkID0geyBcbiAgICAgICAgICAgICAgICBwYWdlU2l6ZToge1xuICAgICAgICAgICAgICAgICAgICB3aWR0aDogMjg4LjAwLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IDIxNi4wMFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHBhZ2VPcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgICAgICAgICAgIHBhZ2VNYXJnaW5zOiBbIDIsIDUsIDIsIDIgXSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6JyonLFxuICAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrOltcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWFyZ2luOls1LDVdLGltYWdlOmNvbXBhbnkubG9nbywgYWxpZ25tZW50OidjZW50ZXInLHdpZHRoOjEwMH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge21hcmdpbjpbNSwxMF0sdGV4dDpcIk5vIERvY3MgUGFja2FnZSAgICAgICAgICAgIFwiK3Nydi5hd2IuaWQsYWxpZ25tZW50OidsZWZ0Jyxib2xkOnRydWUsZm9udFNpemU6MTEsbWFyZ2luOlsxLDFdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpcIkN1c3RvbWVyXCIsYm9sZDp0cnVlLGFsaWdubWVudDonbGVmdCcsZm9udFNpemU6OSxtYXJnaW46WzIsMTAsMiwxXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6YCR7c3J2LmF3Yi5jdXN0b21lci5uYW1lfWAsIGJvbGQ6dHJ1ZSxhbGlnbm1lbnQ6J2xlZnQnLGZvbnRTaXplOjgsbWFyZ2luOlsyLDJdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpgVmVuZG9yYCxhbGlnbm1lbnQ6J2xlZnQnLGZvbnRTaXplOjksYm9sZDp0cnVlLG1hcmdpbjpbMiwxMCwyLDFdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpgJHtzcnYuYXdiLnNoaXBwZXJ9YCxhbGlnbm1lbnQ6J2xlZnQnLGZvbnRTaXplOjksYm9sZDp0cnVlLG1hcmdpbjpbMiwyXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6YFJlZiBOb2AsYm9sZDp0cnVlLCBhbGlnbm1lbnQ6J2xlZnQnLGZvbnRTaXplOjksYm9sZDp0cnVlLG1hcmdpbjpbMiwxMCwyLDFdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7dGV4dDpgMTEwMGAsYm9sZDp0cnVlLCBhbGlnbm1lbnQ6J2xlZnQnLGZvbnRTaXplOjksYm9sZDp0cnVlLG1hcmdpbjpbMiwyXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge3RleHQ6YCR7bW9tZW50KCkuZm9ybWF0KFwiTU0vREQvWVkgaGg6bW0gQVwiKX1gLGJvbGQ6dHJ1ZSwgYWxpZ25tZW50OidsZWZ0Jyxmb250U2l6ZTo5LGJvbGQ6dHJ1ZSxtYXJnaW46WzIsMTBdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRTdHlsZToge1xuICAgICAgICAgICAgICAgICAgICBmb250OiAnSGVsdmV0aWNhJyxcbiAgICAgICAgICAgICAgICAgICAgZm9udFNpemU6OFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9ICBzcnYuYXdiLmlkKycnKyctbm8tZG9jLnBkZic7IFxuICAgICAgICAgICAgdmFyIHBkZkRvYyA9IHByaW50ZXIuY3JlYXRlUGRmS2l0RG9jdW1lbnQoZGQpO1xuICAgICAgICAgICAgcGRmRG9jLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZW5hbWUpKTtcbiAgICAgICAgICAgIHBkZkRvYy5lbmQoKTtcbiAgICAgICAgICAgIHJlc29sdmUoe2dlbmVyYXRlZDp0cnVlLGZpbGVuYW1lOmZpbGVuYW1lfSlcbiAgICAgICAgfSlcbiAgICB9XG59Il19
