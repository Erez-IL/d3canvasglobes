(function() {
  var ε = 1e-6, ε2 = ε * ε, π = Math.PI, sqrtπ = Math.sqrt(π), radians = π / 180, degrees = 180 / π;
  var projection = d3.geo.projection, projectionMutator = d3.geo.projectionMutator;
  function sinci(x) {
    return x ? x / Math.sin(x) : 1;
  }
  function sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }
  function asqrt(x) {
    return x > 0 ? Math.sqrt(x) : 0;
  }
  function asin(x) {
    return x > 1 ? π / 2 : x < -1 ? -π / 2 : Math.asin(x);
  }
  function acos(x) {
    return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
  }
  function parallel1Projection(projectAt) {
    var φ0 = 0, m = projectionMutator(projectAt), p = m(φ0);
    p.parallel = function(_) {
      if (!arguments.length) return φ0 / π * 180;
      return m(φ0 = _ * π / 180);
    };
    return p;
  }
  function parallel2Projection(projectAt) {
    var φ0 = 0, φ1 = π / 3, m = projectionMutator(projectAt), p = m(φ0, φ1);
    p.parallels = function(_) {
      if (!arguments.length) return [ φ0 / π * 180, φ1 / π * 180 ];
      return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
    };
    return p;
  }
  d3.geo.interrupt = function(project) {
    var lobes = [ [ [ [ -π, 0 ], [ 0, π / 2 ], [ π, 0 ] ] ], [ [ [ -π, 0 ], [ 0, -π / 2 ], [ π, 0 ] ] ] ];
    var projection = d3.geo.projection(function(λ, φ) {
      var sign = φ < 0 ? -1 : +1, hemilobes = lobes[+(φ < 0)];
      for (var i = 0, n = hemilobes.length - 1; i < n && λ > hemilobes[i][2][0]; ++i) ;
      var coordinates = project(λ - hemilobes[i][1][0], φ);
      coordinates[0] += project(hemilobes[i][1][0], sign * φ > sign * hemilobes[i][0][1] ? hemilobes[i][0][1] : φ)[0];
      return coordinates;
    });
    var stream_ = projection.stream;
    projection.stream = function(stream) {
      var rotate = projection.rotate(), rotateStream = stream_(stream), sphereStream = (projection.rotate([ 0, 0 ]), 
      stream_(stream));
      projection.rotate(rotate);
      rotateStream.sphere = function() {
        d3.geo.stream(sphere(), sphereStream);
      };
      return rotateStream;
    };
    projection.lobes = function(_) {
      if (!arguments.length) return lobes.map(function(lobes) {
        return lobes.map(function(lobe) {
          return [ [ lobe[0][0] * 180 / π, lobe[0][1] * 180 / π ], [ lobe[1][0] * 180 / π, lobe[1][1] * 180 / π ], [ lobe[2][0] * 180 / π, lobe[2][1] * 180 / π ] ];
        });
      });
      lobes = _.map(function(lobes) {
        return lobes.map(function(lobe) {
          return [ [ lobe[0][0] * π / 180, lobe[0][1] * π / 180 ], [ lobe[1][0] * π / 180, lobe[1][1] * π / 180 ], [ lobe[2][0] * π / 180, lobe[2][1] * π / 180 ] ];
        });
      });
      return projection;
    };
    function sphere() {
      var ε = 1e-6, coordinates = [];
      for (var i = 0, n = lobes[0].length; i < n; ++i) {
        var lobe = lobes[0][i], λ0 = lobe[0][0] * 180 / π, φ0 = lobe[0][1] * 180 / π, φ1 = lobe[1][1] * 180 / π, λ2 = lobe[2][0] * 180 / π, φ2 = lobe[2][1] * 180 / π;
        coordinates.push(resample([ [ λ0 + ε, φ0 + ε ], [ λ0 + ε, φ1 - ε ], [ λ2 - ε, φ1 - ε ], [ λ2 - ε, φ2 + ε ] ], 30));
      }
      for (var i = lobes[1].length - 1; i >= 0; --i) {
        var lobe = lobes[1][i], λ0 = lobe[0][0] * 180 / π, φ0 = lobe[0][1] * 180 / π, φ1 = lobe[1][1] * 180 / π, λ2 = lobe[2][0] * 180 / π, φ2 = lobe[2][1] * 180 / π;
        coordinates.push(resample([ [ λ2 - ε, φ2 - ε ], [ λ2 - ε, φ1 + ε ], [ λ0 + ε, φ1 + ε ], [ λ0 + ε, φ0 - ε ] ], 30));
      }
      return {
        type: "Polygon",
        coordinates: [ d3.merge(coordinates) ]
      };
    }
    function resample(coordinates, m) {
      var i = -1, n = coordinates.length, p0 = coordinates[0], p1, dx, dy, resampled = [];
      while (++i < n) {
        p1 = coordinates[i];
        dx = (p1[0] - p0[0]) / m;
        dy = (p1[1] - p0[1]) / m;
        for (var j = 0; j < m; ++j) resampled.push([ p0[0] + j * dx, p0[1] + j * dy ]);
        p0 = p1;
      }
      resampled.push(p1);
      return resampled;
    }
    return projection;
  };
  function aitoff(λ, φ) {
    var cosφ = Math.cos(φ), sinciα = sinci(acos(cosφ * Math.cos(λ /= 2)));
    return [ 2 * cosφ * Math.sin(λ) * sinciα, Math.sin(φ) * sinciα ];
  }
  aitoff.invert = function(x, y) {
    var λ = x, φ = y, i = 25;
    do {
      var sinλ = Math.sin(λ), sinλ_2 = Math.sin(λ / 2), cosλ_2 = Math.cos(λ / 2), sinφ = Math.sin(φ), cosφ = Math.cos(φ), sin_2φ = Math.sin(2 * φ), sin2φ = sinφ * sinφ, cos2φ = cosφ * cosφ, sin2λ_2 = sinλ_2 * sinλ_2, C = 1 - cos2φ * cosλ_2 * cosλ_2, E = C ? acos(cosφ * cosλ_2) * Math.sqrt(F = 1 / C) : F = 0, F, fx = 2 * E * cosφ * sinλ_2 - x, fy = E * sinφ - y, δxδλ = F * (cos2φ * sin2λ_2 + E * cosφ * cosλ_2 * sin2φ), δxδφ = F * (.5 * sinλ * sin_2φ - E * 2 * sinφ * sinλ_2), δyδλ = F * .25 * (sin_2φ * sinλ_2 - E * sinφ * cos2φ * sinλ), δyδφ = F * (sin2φ * cosλ_2 + E * sin2λ_2 * cosφ), denominator = δxδφ * δyδλ - δyδφ * δxδλ;
      if (!denominator) break;
      var δλ = (fy * δxδφ - fx * δyδφ) / denominator, δφ = (fx * δyδλ - fy * δxδλ) / denominator;
      λ -= δλ, φ -= δφ;
    } while ((Math.abs(δλ) > ε || Math.abs(δφ) > ε) && --i > 0);
    return [ λ, φ ];
  };
  (d3.geo.aitoff = function() {
    return projection(aitoff);
  }).raw = aitoff;
  function guyou(λ, φ) {
    return guyouEllipticFi(λ, sgn(φ) * Math.log(Math.tan(.5 * (Math.abs(φ) + π / 2))), .5);
  }
  function guyouEllipticFi(φ, ψ, m) {
    var r = Math.abs(φ), i = Math.abs(ψ), sinhψ = .5 * ((sinhψ = Math.exp(i)) - 1 / sinhψ);
    if (r) {
      var cscφ = 1 / Math.sin(r), cotφ2 = (cotφ2 = Math.cos(r) * cscφ) * cotφ2, b = -(cotφ2 + m * (sinhψ * sinhψ * cscφ * cscφ + 1) - 1), cotλ2 = .5 * (-b + Math.sqrt(b * b - 4 * (m - 1) * cotφ2));
      return [ guyouEllipticF(Math.atan(1 / Math.sqrt(cotλ2)), m) * sgn(φ), guyouEllipticF(Math.atan(Math.sqrt(cotλ2 / cotφ2 - 1) / m), 1 - m) * sgn(ψ) ];
    }
    return [ 0, guyouEllipticF(Math.atan(sinhψ), 1 - m) * sgn(ψ) ];
  }
  function guyouEllipticF(φ, m) {
    var a = 1, b = Math.sqrt(1 - m), c = Math.sqrt(m);
    for (var i = 0; Math.abs(c) > ε; i++) {
      if (φ % π) {
        var dφ = Math.atan(b * Math.tan(φ) / a);
        if (dφ < 0) dφ += π;
        φ += dφ + ~~(φ / π) * π;
      } else φ += φ;
      c = (a + b) / 2;
      b = Math.sqrt(a * b);
      c = ((a = c) - b) / 2;
    }
    return φ / (Math.pow(2, i) * a);
  }
  (d3.geo.guyou = function() {
    return projection(guyou);
  }).raw = guyou;
  function mollweideBromleyθ(Cp) {
    return function(θ) {
      var Cpsinθ = Cp * Math.sin(θ), i = 30, δ;
      do θ -= δ = (θ + Math.sin(θ) - Cpsinθ) / (1 + Math.cos(θ)); while (Math.abs(δ) > ε && --i > 0);
      return θ / 2;
    };
  }
  function mollweideBromley(Cx, Cy, Cp) {
    var θ = mollweideBromleyθ(Cp);
    function forward(λ, φ) {
      return [ Cx * λ * Math.cos(φ = θ(φ)), Cy * Math.sin(φ) ];
    }
    forward.invert = function(x, y) {
      var θ = asin(y / Cy);
      return [ x / (Cx * Math.cos(θ)), asin((2 * θ + Math.sin(2 * θ)) / Cp) ];
    };
    return forward;
  }
  var mollweideθ = mollweideBromleyθ(π), mollweide = mollweideBromley(2 * Math.SQRT2 / π, Math.SQRT2, π);
  (d3.geo.mollweide = function() {
    return projection(mollweide);
  }).raw = mollweide;
  function sinusoidal(λ, φ) {
    return [ λ * Math.cos(φ), φ ];
  }
  sinusoidal.invert = function(x, y) {
    return [ x / Math.cos(y), y ];
  };
  (d3.geo.sinusoidal = function() {
    return projection(sinusoidal);
  }).raw = sinusoidal;
  var sinuMollweideφ = .7109889596207567, sinuMollweideY = .0528035274542;
  function sinuMollweide(λ, φ) {
    return φ > -sinuMollweideφ ? (λ = mollweide(λ, φ), λ[1] += sinuMollweideY, λ) : sinusoidal(λ, φ);
  }
  sinuMollweide.invert = function(x, y) {
    return y > -sinuMollweideφ ? mollweide.invert(x, y - sinuMollweideY) : sinusoidal.invert(x, y);
  };
  (d3.geo.sinuMollweide = function() {
    return projection(sinuMollweide).rotate([ -20, -55 ]);
  }).raw = sinuMollweide;
  function armadillo(φ0) {
    var sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sφ0 = φ0 > 0 ? 1 : -1, tanφ0 = Math.tan(sφ0 * φ0), k = (1 + sinφ0 - cosφ0) / 2;
    function forward(λ, φ) {
      var cosφ = Math.cos(φ), cosλ = Math.cos(λ /= 2);
      return [ (1 + cosφ) * Math.sin(λ), (sφ0 * φ > -Math.atan2(cosλ, tanφ0) - .001 ? 0 : -sφ0 * 10) + k + Math.sin(φ) * cosφ0 - (1 + cosφ) * sinφ0 * cosλ ];
    }
    forward.invert = function(x, y) {
      var λ = 0, φ = 0, i = 50;
      do {
        var cosλ = Math.cos(λ), sinλ = Math.sin(λ), cosφ = Math.cos(φ), sinφ = Math.sin(φ), A = 1 + cosφ, fx = A * sinλ - x, fy = k + sinφ * cosφ0 - A * sinφ0 * cosλ - y, δxδλ = .5 * A * cosλ, δxδφ = -sinλ * sinφ, δyδλ = .5 * sinφ0 * A * sinλ, δyδφ = cosφ0 * cosφ + sinφ0 * cosλ * sinφ, denominator = δxδφ * δyδλ - δyδφ * δxδλ, δλ = .5 * (fy * δxδφ - fx * δyδφ) / denominator, δφ = (fx * δyδλ - fy * δxδλ) / denominator;
        λ -= δλ, φ -= δφ;
      } while ((Math.abs(δλ) > ε || Math.abs(δφ) > ε) && --i > 0);
      return sφ0 * φ > -Math.atan2(Math.cos(λ), tanφ0) - .001 ? [ λ * 2, φ ] : null;
    };
    return forward;
  }
  function armadilloProjection() {
    var φ0 = π / 9, sφ0 = φ0 > 0 ? 1 : -1, tanφ0 = Math.tan(sφ0 * φ0), m = projectionMutator(armadillo), p = m(φ0), stream_ = p.stream;
    p.parallel = function(_) {
      if (!arguments.length) return φ0 / π * 180;
      tanφ0 = Math.tan((sφ0 = (φ0 = _ * π / 180) > 0 ? 1 : -1) * φ0);
      return m(φ0);
    };
    p.stream = function(stream) {
      var rotate = p.rotate(), rotateStream = stream_(stream), sphereStream = (p.rotate([ 0, 0 ]), 
      stream_(stream));
      p.rotate(rotate);
      rotateStream.sphere = function() {
        sphereStream.polygonStart(), sphereStream.lineStart();
        for (var λ = sφ0 * -180; sφ0 * λ < 180; λ += sφ0 * 90) sphereStream.point(λ, sφ0 * 90);
        while (sφ0 * (λ -= φ0) >= -180) {
          sphereStream.point(λ, sφ0 * -Math.atan2(Math.cos(λ * radians / 2), tanφ0) * degrees);
        }
        sphereStream.lineEnd(), sphereStream.polygonEnd();
      };
      return rotateStream;
    };
    return p;
  }
  (d3.geo.armadillo = armadilloProjection).raw = armadillo;
  function august(λ, φ) {
    var tanφ = Math.tan(φ / 2), k = 1 - tanφ * tanφ, c = 1 + k * Math.cos(λ /= 2), x = Math.sin(λ) * k / c, y = tanφ / c, x2 = x * x, y2 = y * y;
    return [ 4 / 3 * x * (3 + x2 - 3 * y2), 4 / 3 * y * (3 + 3 * x2 - y2) ];
  }
  (d3.geo.august = function() {
    return projection(august);
  }).raw = august;
  var bakerφ = Math.log(1 + Math.SQRT2);
  function baker(λ, φ) {
    var φ0 = Math.abs(φ);
    return φ0 < π / 4 ? [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ] : [ λ * Math.cos(φ0) * (2 * Math.SQRT2 - 1 / Math.sin(φ0)), sgn(φ) * (2 * Math.SQRT2 * (φ0 - π / 4) - Math.log(Math.tan(φ0 / 2))) ];
  }
  baker.invert = function(x, y) {
    if ((y0 = Math.abs(y)) < bakerφ) return [ x, 2 * Math.atan(Math.exp(y)) - π / 2 ];
    var sqrt8 = Math.sqrt(8), φ = π / 4, i = 25, δ, y0;
    do {
      var cosφ_2 = Math.cos(φ / 2), tanφ_2 = Math.tan(φ / 2);
      φ -= δ = (sqrt8 * (φ - π / 4) - Math.log(tanφ_2) - y0) / (sqrt8 - .5 * cosφ_2 * cosφ_2 / tanφ_2);
    } while (Math.abs(δ) > ε2 && --i > 0);
    return [ x / (Math.cos(φ) * (sqrt8 - 1 / Math.sin(φ))), sgn(y) * φ ];
  };
  (d3.geo.baker = function() {
    return projection(baker);
  }).raw = baker;
  var berghausAzimuthalEquidistant = d3.geo.azimuthalEquidistant.raw;
  function berghaus(n) {
    var k = 2 * π / n;
    function forward(λ, φ) {
      var p = berghausAzimuthalEquidistant(λ, φ);
      if (Math.abs(λ) > π / 2) {
        var θ = Math.atan2(p[1], p[0]), r = Math.sqrt(p[0] * p[0] + p[1] * p[1]), θ0 = k * Math.round((θ - π / 2) / k) + π / 2, α = Math.atan2(Math.sin(θ -= θ0), 2 - Math.cos(θ));
        θ = θ0 + asin(π / r * Math.sin(α)) - α;
        p[0] = r * Math.cos(θ);
        p[1] = r * Math.sin(θ);
      }
      return p;
    }
    return forward;
  }
  function berghausProjection() {
    var n = 5, m = projectionMutator(berghaus), p = m(n), stream_ = p.stream;
    p.lobes = function(_) {
      if (!arguments.length) return n;
      return m(n = +_);
    };
    p.stream = function(stream) {
      var rotate = p.rotate(), rotateStream = stream_(stream), sphereStream = (p.rotate([ 0, 0 ]), 
      stream_(stream));
      p.rotate(rotate);
      rotateStream.sphere = function() {
        sphereStream.polygonStart(), sphereStream.lineStart();
        var ε = 1e-4;
        for (var i = 0, δ = 360 / n, φ = 90 - 180 / n; i < n; ++i, φ -= δ) {
          sphereStream.point(180, 0);
          if (φ < -90) {
            sphereStream.point(-90, 180 - φ - ε);
            sphereStream.point(-90, 180 - φ + ε);
          } else {
            sphereStream.point(90, φ + ε);
            sphereStream.point(90, φ - ε);
          }
        }
        sphereStream.lineEnd(), sphereStream.polygonEnd();
      };
      return rotateStream;
    };
    return p;
  }
  (d3.geo.berghaus = berghausProjection).raw = berghaus;
  function boggs(λ, φ) {
    var k = 2.00276, θ = mollweideθ(φ);
    return [ k * λ / (1 / Math.cos(φ) + 1.11072 / Math.cos(θ)), (φ + Math.SQRT2 * Math.sin(θ)) / k ];
  }
  boggs.invert = function(x, y) {
    var k = 2.00276, ky = k * y, θ = y < 0 ? -π / 4 : π / 4, i = 25, δ, φ;
    do {
      φ = ky - Math.SQRT2 * Math.sin(θ);
      θ -= δ = (Math.sin(2 * θ) + 2 * θ - π * Math.sin(φ)) / (2 * Math.cos(2 * θ) + 2 + π * Math.cos(φ) * Math.SQRT2 * Math.cos(θ));
    } while (Math.abs(δ) > ε && --i > 0);
    φ = ky - Math.SQRT2 * Math.sin(θ);
    return [ x * (1 / Math.cos(φ) + 1.11072 / Math.cos(θ)) / k, φ ];
  };
  (d3.geo.boggs = function() {
    return projection(boggs);
  }).raw = boggs;

  function bonne(φ0) {
    if (!φ0) return sinusoidal;
    var cotφ0 = 1 / Math.tan(φ0);
    function forward(λ, φ) {
      var ρ = cotφ0 + φ0 - φ, E = ρ ? λ * Math.cos(φ) / ρ : ρ;
      return [ ρ * Math.sin(E), cotφ0 - ρ * Math.cos(E) ];
    }
    forward.invert = function(x, y) {
      var ρ = Math.sqrt(x * x + (y = cotφ0 - y) * y), φ = cotφ0 + φ0 - ρ;
      return [ ρ / Math.cos(φ) * Math.atan2(x, y), φ ];
    };
    return forward;
  }

	(d3.geo.bonne = function() {
		return parallel1Projection(bonne).parallel(45);
	}).raw = bonne;

// based on Bonne / Werner

	function bonneHeart(λOffset) {
		var //φ0 = 1.2835, // 85° fixed for heart
			φ0 = 1.57079633, // 85° fixed for heart
			cotφ0 = 1 / Math.tan(φ0);
		function forward(λ, φ) {
			var ρ = cotφ0 + φ0 - φ, E;
				E = ρ ? (λ + λOffset) * Math.cos(φ) / ρ : ρ;
			return [ ρ * Math.sin(E), cotφ0 - ρ * Math.cos(E) ];
		}
		forward.invert = function(x, y) {
			var ρ = Math.sqrt(x * x + (y = cotφ0 - y) * y), φ = cotφ0 + φ0 - ρ;
			return [ ρ / Math.cos(φ) * Math.atan2(x, y), φ ];
		};
		return forward;
	}
	(d3.geo.bonneHeart = function() {
		return parallel1Projection(bonneHeart);
	}).raw = bonneHeart;


  var bromley = mollweideBromley(1, 4 / π, π);
  (d3.geo.bromley = function() {
    return projection(bromley);
  }).raw = bromley;
  function collignon(λ, φ) {
    var α = asqrt(1 - Math.sin(φ));
    return [ 2 / sqrtπ * λ * α, sqrtπ * (1 - α) ];
  }
  collignon.invert = function(x, y) {
    var λ = (λ = y / sqrtπ - 1) * λ;
    return [ λ > 0 ? x * Math.sqrt(π / λ) / 2 : 0, asin(1 - λ) ];
  };
  (d3.geo.collignon = function() {
    return projection(collignon);
  }).raw = collignon;
  function conicConformal(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), t = function(φ) {
      return Math.tan(π / 4 + φ / 2);
    }, n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)), F = cosφ0 * Math.pow(t(φ0), n) / n;
    if (!n) return conicConformalMercator;
    function forward(λ, φ) {
      var ρ = Math.abs(Math.abs(φ) - π / 2) < ε ? 0 : F / Math.pow(t(φ), n);
      return [ ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = F - y, ρ = sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
      return [ Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - π / 2 ];
    };
    return forward;
  }
  function conicConformalMercator(λ, φ) {
    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
  }
  conicConformalMercator.invert = function(x, y) {
    return [ x, 2 * Math.atan(Math.exp(y)) - π / 2 ];
  };
  (d3.geo.conicConformal = function() {
    return parallel2Projection(conicConformal);
  }).raw = conicConformal;
  function conicEquidistant(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0), G = cosφ0 / n + φ0;
    if (Math.abs(n) < ε) return d3.geo.equirectangular.raw;
    function forward(λ, φ) {
      var ρ = G - φ;
      return [ ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = G - y;
      return [ Math.atan2(x, ρ0_y) / n, G - sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y) ];
    };
    return forward;
  }
  (d3.geo.conicEquidistant = function() {
    return parallel2Projection(conicEquidistant);
  }).raw = conicEquidistant;
  function craig(φ0) {
    var tanφ0 = Math.tan(φ0);
    function forward(λ, φ) {
      return [ λ, (λ ? λ / Math.sin(λ) : 1) * (Math.sin(φ) * Math.cos(λ) - tanφ0 * Math.cos(φ)) ];
    }
    return forward;
  }
  (d3.geo.craig = function() {
    return parallel1Projection(craig);
  }).raw = craig;
  function craster(λ, φ) {
    var sqrt3 = Math.sqrt(3);
    return [ sqrt3 * λ * (2 * Math.cos(2 * φ / 3) - 1) / sqrtπ, sqrt3 * sqrtπ * Math.sin(φ / 3) ];
  }
  craster.invert = function(x, y) {
    var sqrt3 = Math.sqrt(3), φ = 3 * asin(y / (sqrt3 * sqrtπ));
    return [ sqrtπ * x / (sqrt3 * (2 * Math.cos(2 * φ / 3) - 1)), φ ];
  };
  (d3.geo.craster = function() {
    return projection(craster);
  }).raw = craster;
  function cylindricalEqualArea(φ0) {
    var cosφ0 = Math.cos(φ0);
    function forward(λ, φ) {
      return [ λ * cosφ0, Math.sin(φ) / cosφ0 ];
    }
    forward.invert = function(x, y) {
      return [ x / cosφ0, asin(y * cosφ0) ];
    };
    return forward;
  }
  (d3.geo.cylindricalEqualArea = function() {
    return parallel1Projection(cylindricalEqualArea);
  }).raw = cylindricalEqualArea;
  function eckert1(λ, φ) {
    var α = Math.sqrt(8 / (3 * π));
    return [ α * λ * (1 - Math.abs(φ) / π), α * φ ];
  }
  eckert1.invert = function(x, y) {
    var α = Math.sqrt(8 / (3 * π)), φ = y / α;
    return [ x / (α * (1 - Math.abs(φ) / π)), φ ];
  };
  (d3.geo.eckert1 = function() {
    return projection(eckert1);
  }).raw = eckert1;
  function eckert2(λ, φ) {
    var α = Math.sqrt(4 - 3 * Math.sin(Math.abs(φ)));
    return [ 2 / Math.sqrt(6 * π) * λ * α, sgn(φ) * Math.sqrt(2 * π / 3) * (2 - α) ];
  }
  eckert2.invert = function(x, y) {
    var α = 2 - Math.abs(y) / Math.sqrt(2 * π / 3);
    return [ x * Math.sqrt(6 * π) / (2 * α), sgn(y) * asin((4 - α * α) / 3) ];
  };
  (d3.geo.eckert2 = function() {
    return projection(eckert2);
  }).raw = eckert2;
  function eckert3(λ, φ) {
    var k = Math.sqrt(π * (4 + π));
    return [ 2 / k * λ * (1 + Math.sqrt(1 - 4 * φ * φ / (π * π))), 4 / k * φ ];
  }
  eckert3.invert = function(x, y) {
    var k = Math.sqrt(π * (4 + π)) / 2;
    return [ x * k / (1 + asqrt(1 - y * y * (4 + π) / (4 * π))), y * k / 2 ];
  };
  (d3.geo.eckert3 = function() {
    return projection(eckert3);
  }).raw = eckert3;
  function eckert4(λ, φ) {
    var k = (2 + π / 2) * Math.sin(φ);
    φ /= 2;
    for (var i = 0, δ = Infinity; i < 10 && Math.abs(δ) > ε; i++) {
      var cosφ = Math.cos(φ);
      φ -= δ = (φ + Math.sin(φ) * (cosφ + 2) - k) / (2 * cosφ * (1 + cosφ));
    }
    return [ 2 / Math.sqrt(π * (4 + π)) * λ * (1 + Math.cos(φ)), 2 * Math.sqrt(π / (4 + π)) * Math.sin(φ) ];
  }
  eckert4.invert = function(x, y) {
    var j = 2 * Math.sqrt(π / (4 + π)), k = asin(y / cy), c = Math.cos(k);
    return [ x / (2 / Math.sqrt(π * (4 + π)) * (1 + c)), asin((k + y / j * (c + 2)) / (2 + π / 2)) ];
  };
  (d3.geo.eckert4 = function() {
    return projection(eckert4);
  }).raw = eckert4;
  function eckert5(λ, φ) {
    return [ λ * (1 + Math.cos(φ)) / Math.sqrt(2 + π), 2 * φ / Math.sqrt(2 + π) ];
  }
  eckert5.invert = function(x, y) {
    var k = Math.sqrt(2 + π), φ = y * k / 2;
    return [ k * x / (1 + Math.cos(φ)), φ ];
  };
  (d3.geo.eckert5 = function() {
    return projection(eckert5);
  }).raw = eckert5;
  function eckert6(λ, φ) {
    var k = (1 + π / 2) * Math.sin(φ);
    for (var i = 0, δ = Infinity; i < 10 && Math.abs(δ) > ε; i++) {
      φ -= δ = (φ + Math.sin(φ) - k) / (1 + Math.cos(φ));
    }
    k = Math.sqrt(2 + π);
    return [ λ * (1 + Math.cos(φ)) / k, 2 * φ / k ];
  }
  eckert6.invert = function(x, y) {
    var j = 1 + π / 2, k = Math.sqrt(j / 2);
    return [ x * 2 * k / (1 + Math.cos(y *= k)), asin((y + Math.sin(y)) / j) ];
  };
  (d3.geo.eckert6 = function() {
    return projection(eckert6);
  }).raw = eckert6;
  function eisenlohr(λ, φ) {
    var f = 3 + Math.sqrt(8), s1 = Math.sin(λ /= 2), c1 = Math.cos(λ), k = Math.sqrt(Math.cos(φ) / 2), cosφ2 = Math.cos(φ /= 2), t = Math.sin(φ) / (cosφ2 + 2 * c1 * k), c = Math.sqrt(2 / (1 + t * t)), v = Math.sqrt((cosφ2 + (c1 + s1) * k) / (cosφ2 + (c1 - s1) * k));
    return [ f * (c * (v - 1 / v) - 2 * Math.log(v)), f * (c * t * (v + 1 / v) - 2 * Math.atan(t)) ];
  }
  (d3.geo.eisenlohr = function() {
    return projection(eisenlohr);
  }).raw = eisenlohr;
  function fahey(λ, φ) {
    var t = Math.tan(φ / 2);
    return [ λ * faheyK * asqrt(1 - t * t), (1 + faheyK) * t ];
  }
  fahey.invert = function(x, y) {
    var t = y / (1 + faheyK);
    return [ x ? x / (faheyK * asqrt(1 - t * t)) : 0, 2 * Math.atan(t) ];
  };
  var faheyK = Math.cos(35 * radians);
  (d3.geo.fahey = function() {
    return projection(fahey);
  }).raw = fahey;
  function gringortenProjection() {
    var quincuncial = false, m = projectionMutator(gringorten), p = m(quincuncial);
    p.quincuncial = function(_) {
      if (!arguments.length) return quincuncial;
      return m(quincuncial = !!_);
    };
    return p;
  }
  function gringorten(quincuncial) {
    return function(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ);
      if (quincuncial) {
        λ = Math.atan2(y, -z) - π / 4;
        φ = asin(x);
      } else {
        λ = Math.atan2(z, x) + π / 2;
        φ = asin(-y);
      }
      while (λ < 0) λ += 2 * π;
      var nφ = φ < 0, df = ~~(λ / (π / 4));
      λ %= π / 2;
      var point = gringortenHexadecant(df & 1 ? π / 2 - λ : λ, Math.abs(φ)), x = point[0], y = point[1], t;
      if (quincuncial && nφ) y = -2 - y;
      if (df > 3) x = -x, y = -y;
      switch (df % 4) {
       case 1:
        x = -x;

       case 2:
        t = x;
        x = -y;
        y = t;
        break;

       case 3:
        y = -y;
        break;
      }
      if (!quincuncial && nφ) x = 2 - x;
      return quincuncial ? [ (x - y) / Math.SQRT2, (x + y) / Math.SQRT2 ] : [ x, y ];
    };
  }
  function gringortenHexadecant(λ, φ) {
    if (φ === π / 2) return [ 0, 0 ];
    var sinφ = Math.sin(φ), r = sinφ * sinφ, r2 = r * r, j = 1 + r2, k = 1 + 3 * r2, q = 1 - r2, z = asin(1 / Math.sqrt(j)), v = q + r * j * z, p2 = (1 - sinφ) / v, p = Math.sqrt(p2), a2 = p2 * j, a = Math.sqrt(a2), h = p * q;
    if (λ === 0) return [ 0, -(h + r * a) ];
    var cosφ = Math.cos(φ), secφ = 1 / cosφ, drdφ = 2 * sinφ * cosφ, dvdφ = (-3 * r + z * k) * drdφ, dp2dφ = (-v * cosφ - (1 - sinφ) * dvdφ) / (v * v), dpdφ = .5 * dp2dφ / p, dhdφ = q * dpdφ - 2 * r * p * drdφ, dra2dφ = r * j * dp2dφ + p2 * k * drdφ, μ = -secφ * drdφ, ν = -secφ * dra2dφ, ζ = -2 * secφ * dhdφ, Λ = 4 * λ / π;
    if (λ > .222 * π || φ < π / 4 && λ > .175 * π) {
      var x = (h + r * asqrt(a2 * (1 + r2) - h * h)) / (1 + r2);
      if (λ > π / 4) return [ x, x ];
      var x1 = x, x0 = .5 * x, i = -1;
      x = .5 * (x0 + x1);
      do {
        var g = Math.sqrt(a2 - x * x), f = x * (ζ + μ * g) + ν * asin(x / a) - Λ;
        if (!f) break;
        if (f < 0) x0 = x; else x1 = x;
        x = .5 * (x0 + x1);
      } while (++i < 50 && Math.abs(x1 - x0) > ε);
    } else {
      for (var x = ε, i = 0; i < 25; i++) {
        var x2 = x * x, g = asqrt(a2 - x2), ζμg = ζ + μ * g, f = x * ζμg + ν * asin(x / a) - Λ, df = ζμg + (ν - μ * x2) / g, dx = g ? -f / df : 0;
        x += dx;
        if (Math.abs(dx) < ε) break;
      }
    }
    return [ x, -h - r * asqrt(a2 - x * x) ];
  }
  (d3.geo.gringorten = gringortenProjection).raw = gringorten;
  function hammerRetroazimuthal(φ0) {
    var sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0);
    function forward(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), sinφ = z * cosφ0 + x * sinφ0, cosλ = Math.cos(λ = Math.atan2(y, x * cosφ0 - z * sinφ0)), cosφ = Math.cos(φ = asin(sinφ)), z = acos(sinφ0 * sinφ + cosφ0 * cosφ * cosλ), sinz = Math.sin(z), K = Math.abs(sinz) > ε ? z / sinz : 1;
      return [ K * cosφ0 * Math.sin(λ), (Math.abs(λ) > π / 2 ? K : -K) * (sinφ0 * cosφ - cosφ0 * sinφ * cosλ) ];
    }
    return forward;
  }
  function hammerRetroazimuthalProjection() {
    var φ0 = 0, m = projectionMutator(hammerRetroazimuthal), p = m(φ0), rotate_ = p.rotate, stream_ = p.stream, circle = d3.geo.circle();
    p.parallel = function(_) {
      if (!arguments.length) return φ0 / π * 180;
      var r = p.rotate();
      return m(φ0 = _ * π / 180).rotate(r);
    };
    p.rotate = function(_) {
      if (!arguments.length) return _ = rotate_.call(p), _[1] += φ0 / π * 180, _;
      rotate_.call(p, [ _[0], _[1] - φ0 / π * 180 ]);
      circle.origin([ -_[0], -_[1] ]);
      return p;
    };
    p.stream = function(stream) {
      stream = stream_(stream);
      stream.sphere = function() {
        stream.polygonStart();
        var ε = .01, ring = circle.angle(90 - ε)().coordinates[0], n = ring.length - 1, i = -1, p;
        stream.lineStart();
        while (++i < n) stream.point((p = ring[i])[0], p[1]);
        stream.lineEnd();
        ring = circle.angle(90 + ε)().coordinates[0];
        n = ring.length - 1;
        stream.lineStart();
        while (--i >= 0) stream.point((p = ring[i])[0], p[1]);
        stream.lineEnd();
        stream.polygonEnd();
      };
      return stream;
    };
    return p;
  }
  (d3.geo.hammerRetroazimuthal = hammerRetroazimuthalProjection).raw = hammerRetroazimuthal;
  var hammerAzimuthalEqualArea = d3.geo.azimuthalEqualArea.raw;
  function hammer(A, B) {
    if (arguments.length < 2) B = A;
    if (B === 1) return hammerAzimuthalEqualArea;
    if (B === Infinity) return hammerQuarticAuthalic;
    function forward(λ, φ) {
      var coordinates = hammerAzimuthalEqualArea(λ / B, φ);
      coordinates[0] *= A;
      return coordinates;
    }
    forward.invert = function(x, y) {
      var coordinates = hammerAzimuthalEqualArea.invert(x / A, y);
      coordinates[0] *= B;
      return coordinates;
    };
    return forward;
  }
  function hammerProjection() {
    var B = 2, m = projectionMutator(hammer), p = m(B);
    p.coefficient = function(_) {
      if (!arguments.length) return B;
      return m(B = +_);
    };
    return p;
  }
  function hammerQuarticAuthalic(λ, φ) {
    return [ λ * Math.cos(φ) / Math.cos(φ /= 2), 2 * Math.sin(φ) ];
  }
  hammerQuarticAuthalic.invert = function(x, y) {
    var φ = 2 * asin(y / 2);
    return [ x * Math.cos(φ / 2) / Math.cos(φ), φ ];
  };
  (d3.geo.hammer = hammerProjection).raw = hammer;
  function hatano(λ, φ) {
    var c = Math.sin(φ) * (φ < 0 ? 2.43763 : 2.67595);
    for (var i = 0, δ; i < 20; i++) {
      φ -= δ = (φ + Math.sin(φ) - c) / (1 + Math.cos(φ));
      if (Math.abs(δ) < ε) break;
    }
    return [ .85 * λ * Math.cos(φ *= .5), Math.sin(φ) * (φ < 0 ? 1.93052 : 1.75859) ];
  }
  hatano.invert = function(x, y) {
    var θ = Math.abs(θ = y * (y < 0 ? .5179951515653813 : .5686373742600607)) > 1 - ε ? θ > 0 ? π / 2 : -π / 2 : asin(θ);
    return [ 1.1764705882352942 * x / Math.cos(θ), Math.abs(θ = ((θ += θ) + Math.sin(θ)) * (y < 0 ? .4102345310814193 : .3736990601468637)) > 1 - ε ? θ > 0 ? π / 2 : -π / 2 : asin(θ) ];
  };
  (d3.geo.hatano = function() {
    return projection(hatano);
  }).raw = hatano;
  var healpixParallel = 41 + 48 / 36 + 37 / 3600;
  function healpix(h) {
    var lambert = d3.geo.cylindricalEqualArea.raw(0), φ0 = healpixParallel * π / 180, dx0 = lambert(π, 0)[0] - lambert(-π, 0)[0], dx1 = d3.geo.collignon.raw(π, φ0)[0] - d3.geo.collignon.raw(-π, φ0)[0], y0 = lambert(0, φ0)[1], y1 = d3.geo.collignon.raw(0, φ0)[1], dy1 = d3.geo.collignon.raw(0, π / 2)[1] - y1, k = 2 * π / h;
    return function(λ, φ) {
      var point;
      if (Math.abs(φ) > φ0) {
        var i = Math.min(h - 1, Math.max(0, Math.floor((λ + π) / k)));
        λ = λ + π * (h - 1) / h - i * k;
        point = d3.geo.collignon.raw(λ, Math.abs(φ));
        point[0] = point[0] * dx0 / dx1 - dx0 * (h - 1) / (2 * h) + i * dx0 / h;
        point[1] = y0 + (point[1] - y1) * 4 * dy1 / dx0;
        if (φ < 0) point[1] = -point[1];
      } else {
        point = lambert(λ, φ);
      }
      point[0] /= 2;
      return point;
    };
  }
  function healpixProjection() {
    var n = 2, m = projectionMutator(healpix), p = m(n), stream_ = p.stream;
    p.lobes = function(_) {
      if (!arguments.length) return n;
      return m(n = +_);
    };
    p.stream = function(stream) {
      var rotate = p.rotate(), rotateStream = stream_(stream), sphereStream = (p.rotate([ 0, 0 ]), 
      stream_(stream));
      p.rotate(rotate);
      rotateStream.sphere = function() {
        d3.geo.stream(sphere(), sphereStream);
      };
      return rotateStream;
    };
    function sphere() {
      var step = 180 / n;
      return {
        type: "Polygon",
        coordinates: [ d3.range(-180, 180 + step / 2, step).map(function(x, i) {
          return [ x, i & 1 ? 90 - 1e-6 : healpixParallel ];
        }).concat(d3.range(180, -180 - step / 2, -step).map(function(x, i) {
          return [ x, i & 1 ? -90 + 1e-6 : -healpixParallel ];
        })) ]
      };
    }
    return p;
  }
  (d3.geo.healpix = healpixProjection).raw = healpix;
  function hill(K) {
    var L = 1 + K, sinβ = Math.sin(1 / L), β = asin(sinβ), A = 2 * Math.sqrt(π / (B = π + 4 * β * L)), B, ρ0 = .5 * A * (L + Math.sqrt(K * (2 + K))), K2 = K * K, L2 = L * L;
    function forward(λ, φ) {
      var t = 1 - Math.sin(φ), ρ, ω;
      if (t && t < 2) {
        var θ = π / 2 - φ, i = 25, δ;
        do {
          var sinθ = Math.sin(θ), cosθ = Math.cos(θ), β_β1 = β + Math.atan2(sinθ, L - cosθ), C = 1 + L2 - 2 * L * cosθ;
          θ -= δ = (θ - K2 * β - L * sinθ + C * β_β1 - .5 * t * B) / (2 * L * sinθ * β_β1);
        } while (Math.abs(δ) > ε2 && --i > 0);
        ρ = A * Math.sqrt(C);
        ω = λ * β_β1 / π;
      } else {
        ρ = A * (K + t);
        ω = λ * β / π;
      }
      return [ ρ * Math.sin(ω), ρ0 - ρ * Math.cos(ω) ];
    }
    forward.invert = function(x, y) {
      var ρ2 = x * x + (y -= ρ0) * y, cosθ = (1 + L2 - ρ2 / (A * A)) / (2 * L), θ = acos(cosθ), sinθ = Math.sin(θ), β_β1 = β + Math.atan2(sinθ, L - cosθ);
      return [ asin(x / Math.sqrt(ρ2)) * π / β_β1, asin(1 - 2 * (θ - K2 * β - L * sinθ + (1 + L2 - 2 * L * cosθ) * β_β1) / B) ];
    };
    return forward;
  }
  function hillProjection() {
    var K = 1, m = projectionMutator(hill), p = m(K);
    p.ratio = function(_) {
      if (!arguments.length) return K;
      return m(K = +_);
    };
    return p;
  }
  (d3.geo.hill = hillProjection).raw = hill;
  function homolosine(λ, φ) {
    return Math.abs(φ) > sinuMollweideφ ? (λ = mollweide(λ, φ), λ[1] -= φ > 0 ? sinuMollweideY : -sinuMollweideY, 
    λ) : sinusoidal(λ, φ);
  }
  homolosine.invert = function(x, y) {
    return Math.abs(y) > sinuMollweideφ ? mollweide.invert(x, y + (y > 0 ? sinuMollweideY : -sinuMollweideY)) : sinusoidal.invert(x, y);
  };
  (d3.geo.homolosine = function() {
    return projection(homolosine);
  }).raw = homolosine;
  function kavrayskiy7(λ, φ) {
    return [ 3 * λ / (2 * π) * Math.sqrt(π * π / 3 - φ * φ), φ ];
  }
  kavrayskiy7.invert = function(x, y) {
    return [ 2 / 3 * π * x / Math.sqrt(π * π / 3 - y * y), y ];
  };
  (d3.geo.kavrayskiy7 = function() {
    return projection(kavrayskiy7);
  }).raw = kavrayskiy7;
  function lagrange(n) {
    return function(λ, φ) {
      if (Math.abs(Math.abs(φ) - π / 2) < ε) return [ 0, φ < 0 ? -2 : 2 ];
      var sinφ = Math.sin(φ), v = Math.pow((1 + sinφ) / (1 - sinφ), n / 2), c = .5 * (v + 1 / v) + Math.cos(λ *= n);
      return [ 2 * Math.sin(λ) / c, (v - 1 / v) / c ];
    };
  }
  function lagrangeProjection() {
    var n = .5, m = projectionMutator(lagrange), p = m(n);
    p.spacing = function(_) {
      if (!arguments.length) return n;
      return m(n = +_);
    };
    return p;
  }
  (d3.geo.lagrange = lagrangeProjection).raw = lagrange;
  function larrivee(λ, φ) {
    return [ λ * (1 + Math.sqrt(Math.cos(φ))) / 2, φ / (Math.cos(φ / 2) * Math.cos(λ / 6)) ];
  }
  larrivee.invert = function(x, y) {
    var x0 = Math.abs(x), y0 = Math.abs(y), π_sqrt2 = π / Math.SQRT2, λ = ε, φ = π / 2;
    if (y0 < π_sqrt2) φ *= y0 / π_sqrt2; else λ += 6 * acos(π_sqrt2 / y0);
    for (var i = 0; i < 25; i++) {
      var sinφ = Math.sin(φ), sqrtcosφ = asqrt(Math.cos(φ)), sinφ_2 = Math.sin(φ / 2), cosφ_2 = Math.cos(φ / 2), sinλ_6 = Math.sin(λ / 6), cosλ_6 = Math.cos(λ / 6), f0 = .5 * λ * (1 + sqrtcosφ) - x0, f1 = φ / (cosφ_2 * cosλ_6) - y0, df0dφ = sqrtcosφ ? -.25 * λ * sinφ / sqrtcosφ : 0, df0dλ = .5 * (1 + sqrtcosφ), df1dφ = (1 + .5 * φ * sinφ_2 / cosφ_2) / (cosφ_2 * cosλ_6), df1dλ = φ / cosφ_2 * (sinλ_6 / 6) / (cosλ_6 * cosλ_6), denom = df0dφ * df1dλ - df1dφ * df0dλ, dφ = (f0 * df1dλ - f1 * df0dλ) / denom, dλ = (f1 * df0dφ - f0 * df1dφ) / denom;
      φ -= dφ;
      λ -= dλ;
      if (Math.abs(dφ) < ε && Math.abs(dλ) < ε) break;
    }
    return [ x < 0 ? -λ : λ, y < 0 ? -φ : φ ];
  };
  (d3.geo.larrivee = function() {
    return projection(larrivee);
  }).raw = larrivee;
  function laskowski(λ, φ) {
    var λ2 = λ * λ, φ2 = φ * φ;
    return [ λ * (.975534 + φ2 * (-.119161 + λ2 * -.0143059 + φ2 * -.0547009)), φ * (1.00384 + λ2 * (.0802894 + φ2 * -.02855 + λ2 * 199025e-9) + φ2 * (.0998909 + φ2 * -.0491032)) ];
  }
  laskowski.invert = function(x, y) {
    var λ = x, φ = y, i = 50;
    do {
      var λ2 = λ * λ, φ2 = φ * φ, λφ = λ * φ, fx = λ * (.975534 + φ2 * (-.119161 + λ2 * -.0143059 + φ2 * -.0547009)) - x, fy = φ * (1.00384 + λ2 * (.0802894 + φ2 * -.02855 + λ2 * 199025e-9) + φ2 * (.0998909 + φ2 * -.0491032)) - y, δxδλ = .975534 - φ2 * (.119161 + 3 * λ2 * .0143059 + φ2 * .0547009), δxδφ = -λφ * (2 * .119161 + 4 * .0547009 * φ2 + 2 * .0143059 * λ2), δyδλ = λφ * (2 * .0802894 + 4 * 199025e-9 * λ2 + 2 * -.02855 * φ2), δyδφ = 1.00384 + λ2 * (.0802894 + 199025e-9 * λ2) + φ2 * (3 * (.0998909 - .02855 * λ2) - 5 * .0491032 * φ2), denominator = δxδφ * δyδλ - δyδφ * δxδλ, δλ = (fy * δxδφ - fx * δyδφ) / denominator, δφ = (fx * δyδλ - fy * δxδλ) / denominator;
      λ -= δλ, φ -= δφ;
    } while ((Math.abs(δλ) > ε || Math.abs(δφ) > ε) && --i > 0);
    return [ λ, φ ];
  };
  (d3.geo.laskowski = function() {
    return projection(laskowski);
  }).raw = laskowski;
  function littrow(λ, φ) {
    return [ Math.sin(λ) / Math.cos(φ), Math.tan(φ) * Math.cos(λ) ];
  }
  littrow.invert = function(x, y) {
    var x2 = x * x, y2 = y * y, y2_1 = y2 + 1, cosφ = x ? Math.SQRT1_2 * Math.sqrt((y2_1 - Math.sqrt(x2 * x2 + 2 * x2 * (y2 - 1) + y2_1 * y2_1)) / x2 + 1) : 1 / Math.sqrt(y2_1);
    return [ asin(x * cosφ), sgn(y) * acos(cosφ) ];
  };
  (d3.geo.littrow = function() {
    return projection(littrow);
  }).raw = littrow;
  function loximuthal(φ0) {
    var cosφ0 = Math.cos(φ0), tanφ0 = Math.tan(π / 4 + φ0 / 2);
    function forward(λ, φ) {
      var y = φ - φ0, x = Math.abs(y) < ε ? λ * cosφ0 : Math.abs(x = π / 4 + φ / 2) < ε || Math.abs(Math.abs(x) - π / 2) < ε ? 0 : λ * y / Math.log(Math.tan(x) / tanφ0);
      return [ x, y ];
    }
    forward.invert = function(x, y) {
      var λ, φ = y + φ0;
      return [ Math.abs(y) < ε ? x / cosφ0 : Math.abs(λ = π / 4 + φ / 2) < ε || Math.abs(Math.abs(λ) - π / 2) < ε ? 0 : x * Math.log(Math.tan(λ) / tanφ0) / y, φ ];
    };
    return forward;
  }
  (d3.geo.loximuthal = function() {
    return parallel1Projection(loximuthal).parallel(40);
  }).raw = loximuthal;
  function miller(λ, φ) {
    return [ λ, 1.25 * Math.log(Math.tan(π / 4 + .4 * φ)) ];
  }
  miller.invert = function(x, y) {
    return [ x, 2.5 * Math.atan(Math.exp(.8 * y)) - .625 * π ];
  };
  (d3.geo.miller = function() {
    return projection(miller);
  }).raw = miller;
  function modifiedStereographic(C) {
    var m = C.length - 1;
    function forward(λ, φ) {
      var cosφ = Math.cos(φ), k = 2 / (1 + cosφ * Math.cos(λ)), zr = k * cosφ * Math.sin(λ), zi = k * Math.sin(φ), i = m, w = C[i], ar = w[0], ai = w[1], t;
      while (--i >= 0) {
        w = C[i];
        ar = w[0] + zr * (t = ar) - zi * ai;
        ai = w[1] + zr * ai + zi * t;
      }
      ar = zr * (t = ar) - zi * ai;
      ai = zr * ai + zi * t;
      return [ ar, ai ];
    }
    forward.invert = function(x, y) {
      var i = 20, zr = x, zi = y;
      do {
        var j = m, w = C[j], ar = w[0], ai = w[1], br = 0, bi = 0, t;
        while (--j >= 0) {
          w = C[j];
          br = ar + zr * (t = br) - zi * bi;
          bi = ai + zr * bi + zi * t;
          ar = w[0] + zr * (t = ar) - zi * ai;
          ai = w[1] + zr * ai + zi * t;
        }
        br = ar + zr * (t = br) - zi * bi;
        bi = ai + zr * bi + zi * t;
        ar = zr * (t = ar) - zi * ai - x;
        ai = zr * ai + zi * t - y;
        var denominator = br * br + bi * bi, δr, δi;
        zr -= δr = (ar * br + ai * bi) / denominator;
        zi -= δi = (ai * br - ar * bi) / denominator;
      } while (Math.abs(δr) + Math.abs(δi) > ε * ε && --i > 0);
      if (i) {
        var ρ = Math.sqrt(zr * zr + zi * zi), c = 2 * Math.atan(ρ * .5), sinc = Math.sin(c);
        return [ Math.atan2(zr * sinc, ρ * Math.cos(c)), ρ ? asin(zi * sinc / ρ) : 0 ];
      }
    };
    return forward;
  }
  var modifiedStereographicCoefficients = {
    alaska: [ [ .9972523, 0 ], [ .0052513, -.0041175 ], [ .0074606, .0048125 ], [ -.0153783, -.1968253 ], [ .0636871, -.1408027 ], [ .3660976, -.2937382 ] ],
    gs48: [ [ .98879, 0 ], [ 0, 0 ], [ -.050909, 0 ], [ 0, 0 ], [ .075528, 0 ] ],
    gs50: [ [ .984299, 0 ], [ .0211642, .0037608 ], [ -.1036018, -.0575102 ], [ -.0329095, -.0320119 ], [ .0499471, .1223335 ], [ .026046, .0899805 ], [ 7388e-7, -.1435792 ], [ .0075848, -.1334108 ], [ -.0216473, .0776645 ], [ -.0225161, .0853673 ] ],
    miller: [ [ .9245, 0 ], [ 0, 0 ], [ .01943, 0 ] ],
    lee: [ [ .721316, 0 ], [ 0, 0 ], [ -.00881625, -.00617325 ] ]
  };
  function modifiedStereographicProjection() {
    var coefficients = modifiedStereographicCoefficients.miller, m = projectionMutator(modifiedStereographic), p = m(coefficients);
    p.coefficients = function(_) {
      if (!arguments.length) return coefficients;
      return m(coefficients = typeof _ === "string" ? modifiedStereographicCoefficients[_] : _);
    };
    return p;
  }
  (d3.geo.modifiedStereographic = modifiedStereographicProjection).raw = modifiedStereographic;
  function mtFlatPolarParabolic(λ, φ) {
    var sqrt6 = Math.sqrt(6), sqrt7 = Math.sqrt(7), θ = Math.asin(7 * Math.sin(φ) / (3 * sqrt6));
    return [ sqrt6 * λ * (2 * Math.cos(2 * θ / 3) - 1) / sqrt7, 9 * Math.sin(θ / 3) / sqrt7 ];
  }
  mtFlatPolarParabolic.invert = function(x, y) {
    var sqrt6 = Math.sqrt(6), sqrt7 = Math.sqrt(7), θ = 3 * asin(y * sqrt7 / 9);
    return [ x * sqrt7 / (sqrt6 * (2 * Math.cos(2 * θ / 3) - 1)), asin(Math.sin(θ) * 3 * sqrt6 / 7) ];
  };
  (d3.geo.mtFlatPolarParabolic = function() {
    return projection(mtFlatPolarParabolic);
  }).raw = mtFlatPolarParabolic;
  function mtFlatPolarQuartic(λ, φ) {
    var k = (1 + Math.SQRT1_2) * Math.sin(φ), θ = φ;
    for (var i = 0, δ; i < 25; i++) {
      θ -= δ = (Math.sin(θ / 2) + Math.sin(θ) - k) / (.5 * Math.cos(θ / 2) + Math.cos(θ));
      if (Math.abs(δ) < ε) break;
    }
    return [ λ * (1 + 2 * Math.cos(θ) / Math.cos(θ / 2)) / (3 * Math.SQRT2), 2 * Math.sqrt(3) * Math.sin(θ / 2) / Math.sqrt(2 + Math.SQRT2) ];
  }
  mtFlatPolarQuartic.invert = function(x, y) {
    var sinθ_2 = y * Math.sqrt(2 + Math.SQRT2) / (2 * Math.sqrt(3)), θ = 2 * asin(sinθ_2);
    return [ 3 * Math.SQRT2 * x / (1 + 2 * Math.cos(θ) / Math.cos(θ / 2)), asin((sinθ_2 + Math.sin(θ)) / (1 + Math.SQRT1_2)) ];
  };
  (d3.geo.mtFlatPolarQuartic = function() {
    return projection(mtFlatPolarQuartic);
  }).raw = mtFlatPolarQuartic;
  function mtFlatPolarSinusoidal(λ, φ) {
    var A = Math.sqrt(6 / (4 + π)), k = (1 + π / 4) * Math.sin(φ), θ = φ / 2;
    for (var i = 0, δ; i < 25; i++) {
      θ -= δ = (θ / 2 + Math.sin(θ) - k) / (.5 + Math.cos(θ));
      if (Math.abs(δ) < ε) break;
    }
    return [ A * (.5 + Math.cos(θ)) * λ / 1.5, A * θ ];
  }
  mtFlatPolarSinusoidal.invert = function(x, y) {
    var A = Math.sqrt(6 / (4 + π)), θ = y / A;
    if (Math.abs(Math.abs(θ) - π / 2) < ε) θ = θ < 0 ? -π / 2 : π / 2;
    return [ 1.5 * x / (A * (.5 + Math.cos(θ))), asin((θ / 2 + Math.sin(θ)) / (1 + π / 4)) ];
  };
  (d3.geo.mtFlatPolarSinusoidal = function() {
    return projection(mtFlatPolarSinusoidal);
  }).raw = mtFlatPolarSinusoidal;
  function naturalEarth(λ, φ) {
    var φ2 = φ * φ, φ4 = φ2 * φ2;
    return [ λ * (.8707 - .131979 * φ2 + φ4 * (-.013791 + φ4 * (.003971 * φ2 - .001529 * φ4))), φ * (1.007226 + φ2 * (.015085 + φ4 * (-.044475 + .028874 * φ2 - .005916 * φ4))) ];
  }
  naturalEarth.invert = function(x, y) {
    var φ = y, i = 25, δ;
    do {
      var φ2 = φ * φ, φ4 = φ2 * φ2;
      φ -= δ = (φ * (1.007226 + φ2 * (.015085 + φ4 * (-.044475 + .028874 * φ2 - .005916 * φ4))) - y) / (1.007226 + φ2 * (.015085 * 3 + φ4 * (-.044475 * 7 + .028874 * 9 * φ2 - .005916 * 11 * φ4)));
    } while (Math.abs(δ) > ε && --i > 0);
    return [ x / (.8707 + (φ2 = φ * φ) * (-.131979 + φ2 * (-.013791 + φ2 * φ2 * φ2 * (.003971 - .001529 * φ2)))), φ ];
  };
  (d3.geo.naturalEarth = function() {
    return projection(naturalEarth);
  }).raw = naturalEarth;
  function nellHammer(λ, φ) {
    return [ λ * (1 + Math.cos(φ)) / 2, 2 * (φ - Math.tan(φ / 2)) ];
  }
  nellHammer.invert = function(x, y) {
    var p = y / 2;
    for (var i = 0, δ = Infinity; i < 10 && Math.abs(δ) > ε; i++) {
      var c = Math.cos(y / 2);
      y -= δ = (y - Math.tan(y / 2) - p) / (1 - .5 / (c * c));
    }
    return [ 2 * x / (1 + Math.cos(y)), y ];
  };
  (d3.geo.nellHammer = function() {
    return projection(nellHammer);
  }).raw = nellHammer;
  function peirceQuincuncial(λ, φ) {
    var t = Math.abs(λ) < π / 2, p = guyou(t ? λ : -sgn(λ) * (π - Math.abs(λ)), φ), x = p[0] / Math.SQRT2 - p[1] / Math.SQRT2, y = p[1] / Math.SQRT2 + p[0] / Math.SQRT2;
    if (t) return [ x, y ];
    var d = 2 * 1.311028777082283, s = x > 0 ^ y > 0 ? -1 : 1;
    return [ s * x - sgn(y) * d, s * y - sgn(x) * d ];
  }
  (d3.geo.peirceQuincuncial = function() {
    return projection(peirceQuincuncial).rotate([ -90, -90, 45 ]).clipAngle(180 - 1e-6);
  }).raw = peirceQuincuncial;
  function polyconic(λ, φ) {
    if (Math.abs(φ) < ε) return [ λ, 0 ];
    var tanφ = Math.tan(φ), k = λ * Math.sin(φ);
    return [ Math.sin(k) / tanφ, φ + (1 - Math.cos(k)) / tanφ ];
  }
  polyconic.invert = function(x, y) {
    if (Math.abs(y) < ε) return [ x, 0 ];
    var k = x * x + y * y, φ = y;
    for (var i = 0, δ = Infinity; i < 10 && Math.abs(δ) > ε; i++) {
      var tanφ = Math.tan(φ);
      φ -= δ = (y * (φ * tanφ + 1) - φ - .5 * (φ * φ + k) * tanφ) / ((φ - y) / tanφ - 1);
    }
    return [ asin(x * Math.tan(φ)) / Math.sin(φ), φ ];
  };
  (d3.geo.polyconic = function() {
    return projection(polyconic);
  }).raw = polyconic;
  function rectangularPolyconic(φ0) {
    var sinφ0 = Math.sin(φ0);
    function forward(λ, φ) {
      var A = sinφ0 ? Math.tan(λ * sinφ0 / 2) / sinφ0 : λ / 2;
      if (!φ) return [ 2 * A, -φ0 ];
      var E = 2 * Math.atan(A * Math.sin(φ)), cotφ = 1 / Math.tan(φ);
      return [ cotφ * Math.sin(E), φ - φ0 + cotφ * (1 - Math.cos(E)) ];
    }
    return forward;
  }
  (d3.geo.rectangularPolyconic = function() {
    return parallel1Projection(rectangularPolyconic);
  }).raw = rectangularPolyconic;
  var robinsonConstants = [ [ .9986, -.062 ], [ 1, 0 ], [ .9986, .062 ], [ .9954, .124 ], [ .99, .186 ], [ .9822, .248 ], [ .973, .31 ], [ .96, .372 ], [ .9427, .434 ], [ .9216, .4958 ], [ .8962, .5571 ], [ .8679, .6176 ], [ .835, .6769 ], [ .7986, .7346 ], [ .7597, .7903 ], [ .7186, .8435 ], [ .6732, .8936 ], [ .6213, .9394 ], [ .5722, .9761 ], [ .5322, 1 ] ];
  robinsonConstants.forEach(function(d) {
    d[1] *= 1.0144;
  });
  function robinson(λ, φ) {
    var i = Math.min(18, Math.abs(φ) * 36 / π), i0 = Math.floor(i), di = i - i0, ax = (k = robinsonConstants[i0])[0], ay = k[1], bx = (k = robinsonConstants[++i0])[0], by = k[1], cx = (k = robinsonConstants[Math.min(19, ++i0)])[0], cy = k[1], k;
    return [ λ * (bx + di * (cx - ax) / 2 + di * di * (cx - 2 * bx + ax) / 2), (φ > 0 ? π : -π) / 2 * (by + di * (cy - ay) / 2 + di * di * (cy - 2 * by + ay) / 2) ];
  }
  robinson.invert = function(x, y) {
    var yy = 2 * y / π, φ = yy * 90, i = Math.min(18, Math.abs(φ / 5)), i0 = Math.max(0, Math.floor(i));
    do {
      var ay = robinsonConstants[i0][1], by = robinsonConstants[i0 + 1][1], cy = robinsonConstants[Math.min(19, i0 + 2)][1], u = cy - ay, v = cy - 2 * by + ay, t = 2 * (Math.abs(yy) - by) / u, c = v / u, di = t * (1 - c * t * (1 - 2 * c * t));
      if (di >= 0 || i0 === 1) {
        φ = (y >= 0 ? 5 : -5) * (di + i);
        var j = 50, δ;
        do {
          i = Math.min(18, Math.abs(φ) / 5);
          i0 = Math.floor(i);
          di = i - i0;
          ay = robinsonConstants[i0][1];
          by = robinsonConstants[i0 + 1][1];
          cy = robinsonConstants[Math.min(19, i0 + 2)][1];
          φ -= (δ = (y >= 0 ? π : -π) / 2 * (by + di * (cy - ay) / 2 + di * di * (cy - 2 * by + ay) / 2) - y) * degrees;
        } while (Math.abs(δ) > ε2 && --j > 0);
        break;
      }
    } while (--i0 >= 0);
    var ax = robinsonConstants[i0][0], bx = robinsonConstants[i0 + 1][0], cx = robinsonConstants[Math.min(19, i0 + 2)][0];
    return [ x / (bx + di * (cx - ax) / 2 + di * di * (cx - 2 * bx + ax) / 2), φ * radians ];
  };
  (d3.geo.robinson = function() {
    return projection(robinson);
  }).raw = robinson;
  function satelliteVertical(P) {
    function forward(λ, φ) {
      var cosφ = Math.cos(φ), k = (P - 1) / (P - cosφ * Math.cos(λ));
      return [ k * cosφ * Math.sin(λ), k * Math.sin(φ) ];
    }
    forward.invert = function(x, y) {
      var ρ2 = x * x + y * y, ρ = Math.sqrt(ρ2), sinc = (P - Math.sqrt(1 - ρ2 * (P + 1) / (P - 1))) / ((P - 1) / ρ + ρ / (P - 1));
      return [ Math.atan2(x * sinc, ρ * Math.sqrt(1 - sinc * sinc)), ρ ? asin(y * sinc / ρ) : 0 ];
    };
    return forward;
  }
  function satellite(P, ω) {
    var vertical = satelliteVertical(P);
    if (!ω) return vertical;
    var cosω = Math.cos(ω), sinω = Math.sin(ω);
    function forward(λ, φ) {
      var coordinates = vertical(λ, φ), y = coordinates[1], A = y * sinω / (P - 1) + cosω;
      return [ coordinates[0] * cosω / A, y / A ];
    }
    forward.invert = function(x, y) {
      var k = (P - 1) / (P - 1 - y * sinω);
      return vertical.invert(k * x, k * y * cosω);
    };
    return forward;
  }
  function satelliteProjection() {
    var P = 1.4, ω = 0, m = projectionMutator(satellite), p = m(P, ω);
    p.distance = function(_) {
      if (!arguments.length) return P;
      return m(P = +_, ω);
    };
    p.tilt = function(_) {
      if (!arguments.length) return ω * 180 / π;
      return m(P, ω = _ * π / 180);
    };
    return p;
  }
  (d3.geo.satellite = satelliteProjection).raw = satellite;
  function times(λ, φ) {
    var t = Math.tan(φ / 2), s = Math.sin(π / 4 * t);
    return [ λ * (.74482 - .34588 * s * s), 1.70711 * t ];
  }
  times.invert = function(x, y) {
    var t = y / 1.70711, s = Math.sin(π / 4 * t);
    return [ x / (.74482 - .34588 * s * s), 2 * Math.atan(t) ];
  };
  (d3.geo.times = function() {
    return projection(times);
  }).raw = times;
  function twoPointAzimuthal(d) {
    var cosd = Math.cos(d);
    function forward(λ, φ) {
      var coordinates = d3.geo.gnomonic.raw(λ, φ);
      coordinates[0] *= cosd;
      return coordinates;
    }
    forward.invert = function(x, y) {
      return d3.geo.gnomonic.raw.invert(x / cosd, y);
    };
    return forward;
  }
  function twoPointAzimuthalProjection() {
    var points = [ [ 0, 0 ], [ 0, 0 ] ], m = projectionMutator(twoPointAzimuthal), p = m(0), rotate = p.rotate;
    delete p.rotate;
    p.points = function(_) {
      if (!arguments.length) return points;
      points = _;
      var interpolate = d3.geo.interpolate(_[0], _[1]), origin = interpolate(.5), p = twoPointEquidistant_rotate(-origin[0] * radians, -origin[1] * radians, _[0][0] * radians, _[0][1] * radians), b = interpolate.distance * .5, c = (p[0] < 0 ? -1 : +1) * p[1], γ = asin(Math.sin(c) / Math.sin(b));
      rotate.call(p, [ -origin[0], -origin[1], -γ * degrees ]);
      return m(b);
    };
    return p;
  }
  (d3.geo.twoPointAzimuthal = twoPointAzimuthalProjection).raw = twoPointAzimuthal;
  function twoPointEquidistant(z0) {
    if (!z0) return d3.geo.azimuthalEquidistant.raw;
    var λa = -z0 / 2, λb = -λa, z02 = z0 * z0, tanλ0 = Math.tan(λb), S = .5 / Math.sin(λb);
    function forward(λ, φ) {
      var za = acos(Math.cos(φ) * Math.cos(λ - λa)), zb = acos(Math.cos(φ) * Math.cos(λ - λb)), ys = φ < 0 ? -1 : 1;
      za *= za, zb *= zb;
      return [ (za - zb) / (2 * z0), ys * asqrt(4 * z02 * zb - (z02 - za + zb) * (z02 - za + zb)) / (2 * z0) ];
    }
    forward.invert = function(x, y) {
      var y2 = y * y, cosza = Math.cos(Math.sqrt(y2 + (t = x + λa) * t)), coszb = Math.cos(Math.sqrt(y2 + (t = x + λb) * t)), t, d;
      return [ Math.atan2(d = cosza - coszb, t = (cosza + coszb) * tanλ0), (y < 0 ? -1 : 1) * acos(Math.sqrt(t * t + d * d) * S) ];
    };
    return forward;
  }
  function twoPointEquidistantProjection() {
    var points = [ [ 0, 0 ], [ 0, 0 ] ], m = projectionMutator(twoPointEquidistant), p = m(0), rotate = p.rotate;
    delete p.rotate;
    p.points = function(_) {
      if (!arguments.length) return points;
      points = _;
      var interpolate = d3.geo.interpolate(_[0], _[1]), origin = interpolate(.5), p = twoPointEquidistant_rotate(-origin[0] * radians, -origin[1] * radians, _[0][0] * radians, _[0][1] * radians), b = interpolate.distance * .5, c = (p[0] < 0 ? -1 : +1) * p[1], γ = asin(Math.sin(c) / Math.sin(b));
      rotate.call(p, [ -origin[0], -origin[1], -γ * degrees ]);
      return m(b * 2);
    };
    return p;
  }
  function twoPointEquidistant_rotate(δλ, δφ, λ, φ) {
    var cosδφ = Math.cos(δφ), sinδφ = Math.sin(δφ), cosφ = Math.cos(φ), x = Math.cos(λ += δλ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ);
    return [ Math.atan2(y, x * cosδφ - z * sinδφ), asin(z * cosδφ + x * sinδφ) ];
  }
  (d3.geo.twoPointEquidistant = twoPointEquidistantProjection).raw = twoPointEquidistant;
  function vanDerGrinten(λ, φ) {
    if (Math.abs(φ) < ε) return [ λ, 0 ];
    var sinθ = Math.abs(2 * φ / π), θ = asin(sinθ);
    if (Math.abs(λ) < ε || Math.abs(Math.abs(φ) - π / 2) < ε) return [ 0, sgn(φ) * π * Math.tan(θ / 2) ];
    var cosθ = Math.cos(θ), A = Math.abs(π / λ - λ / π) / 2, A2 = A * A, G = cosθ / (sinθ + cosθ - 1), P = G * (2 / sinθ - 1), P2 = P * P, P2_A2 = P2 + A2, G_P2 = G - P2, Q = A2 + G;
    return [ sgn(λ) * π * (A * G_P2 + Math.sqrt(A2 * G_P2 * G_P2 - P2_A2 * (G * G - P2))) / P2_A2, sgn(φ) * π * (P * Q - A * Math.sqrt((A2 + 1) * P2_A2 - Q * Q)) / P2_A2 ];
  }
  vanDerGrinten.invert = function(x, y) {
    if (Math.abs(y) < ε) return [ x, 0 ];
    if (Math.abs(x) < ε) return [ 0, π / 2 * Math.sin(2 * Math.atan(y / π)) ];
    var x2 = (x /= π) * x, y2 = (y /= π) * y, x2_y2 = x2 + y2, z = x2_y2 * x2_y2, c1 = -Math.abs(y) * (1 + x2_y2), c2 = c1 - 2 * y2 + x2, c3 = -2 * c1 + 1 + 2 * y2 + z, d = y2 / c3 + (2 * c2 * c2 * c2 / (c3 * c3 * c3) - 9 * c1 * c2 / (c3 * c3)) / 27, a1 = (c1 - c2 * c2 / (3 * c3)) / c3, m1 = 2 * Math.sqrt(-a1 / 3), θ1 = acos(3 * d / (a1 * m1)) / 3;
    return [ π * (x2_y2 - 1 + Math.sqrt(1 + 2 * (x2 - y2) + z)) / (2 * x), sgn(y) * π * (-m1 * Math.cos(θ1 + π / 3) - c2 / (3 * c3)) ];
  };
  (d3.geo.vanDerGrinten = function() {
    return projection(vanDerGrinten);
  }).raw = vanDerGrinten;
  function vanDerGrinten2(λ, φ) {
    if (Math.abs(φ) < ε) return [ λ, 0 ];
    var sinθ = Math.abs(2 * φ / π), θ = asin(sinθ);
    if (Math.abs(λ) < ε || Math.abs(Math.abs(φ) - π / 2) < ε) return [ 0, sgn(φ) * π * Math.tan(θ / 2) ];
    var cosθ = Math.cos(θ), A = Math.abs(π / λ - λ / π) / 2, A2 = A * A, x1 = cosθ * (Math.sqrt(1 + A2) - A * cosθ) / (1 + A2 * sinθ * sinθ);
    return [ sgn(λ) * π * x1, sgn(φ) * π * asqrt(1 - x1 * (2 * A + x1)) ];
  }
  (d3.geo.vanDerGrinten2 = function() {
    return projection(vanDerGrinten2);
  }).raw = vanDerGrinten2;
  function vanDerGrinten3(λ, φ) {
    if (Math.abs(φ) < ε) return [ λ, 0 ];
    var sinθ = Math.abs(2 * φ / π), θ = asin(sinθ);
    if (Math.abs(λ) < ε || Math.abs(Math.abs(φ) - π / 2) < ε) return [ 0, sgn(φ) * π * Math.tan(θ / 2) ];
    var cosθ = Math.cos(θ), A = Math.abs(π / λ - λ / π) / 2, y1 = sinθ / (1 + cosθ);
    return [ sgn(λ) * π * (asqrt(A * A + 1 - y1 * y1) - A), sgn(φ) * π * y1 ];
  }
  (d3.geo.vanDerGrinten3 = function() {
    return projection(vanDerGrinten3);
  }).raw = vanDerGrinten3;
  function vanDerGrinten4(λ, φ) {
    if (!φ) return [ λ, 0 ];
    var φ0 = Math.abs(φ);
    if (!λ || φ0 === π / 2) return [ 0, φ ];
    var t, B = 2 * φ0 / π, B2 = B * B, C = (8 * B - B2 * (B2 + 2) - 5) / (2 * B2 * (B - 1)), C2 = C * C, BC = B * C, B_C2 = B2 + C2 + 2 * BC, D = sgn(Math.abs(λ) - π / 2) * Math.sqrt((t = (t = 2 * λ / π) + 1 / t) * t - 4), D2 = D * D, F = B_C2 * (B2 + C2 * D2 - 1) + (1 - B2) * (B2 * ((t = B + 3 * C) * t + 4 * C2) + 12 * BC * C2 + 4 * C2 * C2), x1 = (D * (B_C2 + C2 - 1) + 2 * Math.sqrt(F)) / (4 * B_C2 + D2);
    return [ sgn(λ) * π * x1 / 2, sgn(φ) * π / 2 * asqrt(1 + D * Math.abs(x1) - x1 * x1) ];
  }
  (d3.geo.vanDerGrinten4 = function() {
    return projection(vanDerGrinten4);
  }).raw = vanDerGrinten4;
  var wagner4 = function() {
    var A = 4 * π + 3 * Math.sqrt(3), B = 2 * Math.sqrt(2 * π * Math.sqrt(3) / A);
    return mollweideBromley(B * Math.sqrt(3) / π, B, A / 6);
  }();
  (d3.geo.wagner4 = function() {
    return projection(wagner4);
  }).raw = wagner4;
  function wagner6(λ, φ) {
    return [ λ * Math.sqrt(1 - 3 * φ * φ / (π * π)), φ ];
  }
  wagner6.invert = function(x, y) {
    return [ x / Math.sqrt(1 - 3 * y * y / (π * π)), y ];
  };
  (d3.geo.wagner6 = function() {
    return projection(wagner6);
  }).raw = wagner6;
  function wagner7(λ, φ) {
    var s = .90631 * Math.sin(φ), c0 = Math.sqrt(1 - s * s), c1 = Math.sqrt(2 / (1 + c0 * Math.cos(λ /= 3)));
    return [ 2.66723 * c0 * c1 * Math.sin(λ), 1.24104 * s * c1 ];
  }
  wagner7.invert = function(x, y) {
    var t1 = x / 2.66723, t2 = y / 1.24104, p = Math.sqrt(t1 * t1 + t2 * t2), c = 2 * asin(p / 2);
    return [ 3 * Math.atan2(x * Math.tan(c), 2.66723 * p), p && asin(y * Math.sin(c) / (1.24104 * .90631 * p)) ];
  };
  (d3.geo.wagner7 = function() {
    return projection(wagner7);
  }).raw = wagner7;
  function wiechel(λ, φ) {
    var cosφ = Math.cos(φ), sinφ = Math.cos(λ) * cosφ, sin1_φ = 1 - sinφ, cosλ = Math.cos(λ = Math.atan2(Math.sin(λ) * cosφ, -Math.sin(φ))), sinλ = Math.sin(λ);
    cosφ = asqrt(1 - sinφ * sinφ);
    return [ sinλ * cosφ - cosλ * sin1_φ, -cosλ * cosφ - sinλ * sin1_φ ];
  }
  (d3.geo.wiechel = function() {
    return projection(wiechel);
  }).raw = wiechel;
  function winkel3(λ, φ) {
    var coordinates = aitoff(λ, φ);
    return [ (coordinates[0] + λ * 2 / π) / 2, (coordinates[1] + φ) / 2 ];
  }
  winkel3.invert = function(x, y) {
    var λ = x, φ = y, i = 25;
    do {
      var cosφ = Math.cos(φ), sinφ = Math.sin(φ), sin_2φ = Math.sin(2 * φ), sin2φ = sinφ * sinφ, cos2φ = cosφ * cosφ, sinλ = Math.sin(λ), cosλ_2 = Math.cos(λ / 2), sinλ_2 = Math.sin(λ / 2), sin2λ_2 = sinλ_2 * sinλ_2, C = 1 - cos2φ * cosλ_2 * cosλ_2, E = C ? acos(cosφ * cosλ_2) * Math.sqrt(F = 1 / C) : F = 0, F, fx = .5 * (2 * E * cosφ * sinλ_2 + λ * 2 / π) - x, fy = .5 * (E * sinφ + φ) - y, δxδλ = .5 * F * (cos2φ * sin2λ_2 + E * cosφ * cosλ_2 * sin2φ) + .5 * 2 / π, δxδφ = F * (sinλ * sin_2φ / 4 - E * sinφ * sinλ_2), δyδλ = .125 * F * (sin_2φ * sinλ_2 - E * sinφ * cos2φ * sinλ), δyδφ = .5 * F * (sin2φ * cosλ_2 + E * sin2λ_2 * cosφ) + .5, denominator = δxδφ * δyδλ - δyδφ * δxδλ, δλ = (fy * δxδφ - fx * δyδφ) / denominator, δφ = (fx * δyδλ - fy * δxδλ) / denominator;
      λ -= δλ, φ -= δφ;
    } while ((Math.abs(δλ) > ε || Math.abs(δφ) > ε) && --i > 0);
    return [ λ, φ ];
  };
  (d3.geo.winkel3 = function() {
    return projection(winkel3);
  }).raw = winkel3;
})();