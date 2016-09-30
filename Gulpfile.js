"use strict";

var gulp = require('gulp');
var del = require('del');
var jshint = require('gulp-jshint');
var less = require('gulp-less');
var path = require('path');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gulpIf = require('gulp-if');
var gutil = require('gulp-util');
var webpack = require('webpack-stream');
var sourcemaps = require('gulp-sourcemaps');
var header = require('gulp-header');
var rename = require('gulp-rename');
var ghPages = require('gulp-gh-pages');
var tap = require('gulp-tap');
var metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var replace = require('metalsmith-text-replace');
var layouts = require('metalsmith-layouts');
var collections = require('metalsmith-collections');


var
    packageFile = 'package.json',
    pkg = require('./' + packageFile),
    paths = {
        scripts: ['src/**/*.js', '!src/jquery.SPServices Intellisense.js'],
        less: ['src/less/**/*.less'],
        docs: ['docs/**/*.md'],
        dist: ['dist/**/*']
    },
//    buildDate   = gulp.template.today('yyyy-mm-dd'),
//    buildYear   = gulp.template.today('yyyy'),
//    buildId     = (new Date()).getTime(),
    banner      = "/*\n" +
        "* <%= pkg.name %> - <%= pkg.description_short %>\n" +
        "* Version <%= pkg.version %>\n" +
        "* @requires <%= pkg.requires %>\n" +
        "*\n" +
        "* Copyright (c) <%= pkg.copyright %>\n" +
        "* Examples and docs at:\n" +
        "* <%= pkg.homepage %>\n" +
        "* Licensed under the MIT license:\n" +
        "* http://www.opensource.org/licenses/mit-license.php\n" +
        "*/\n" +
        "/*\n" +
        "* @description <%= pkg.description_long %>\n" +
        "* @type jQuery\n" +
        "* @name <%= pkg.name %>\n" +
        "* @category Plugins/<%= pkg.name %>\n" +
        "* @author <%= pkg.authors %>\n" +
//        "* @build <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today('yyyy-mm-dd hh:MM:ss') %>\n" +
        "*/\n";



gulp.task('config', function() {
    fs = require("fs");
    pkg = fs.readFileSync(packageFile, "utf8");
    gutil.log(pkg.toString());

});

gulp.task('clean:build', function() {
    // You can use multiple globbing patterns as you would with `gulp.src`
    return del(['build']);
});

// Convert .less files to .css
gulp.task('less', function () {
    return gulp.src(paths.less)
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes') ]
        }))
        .pipe(gulp.dest('src/css'));
});

// Lint the files to catch any issues
gulp.task('lint', function() {
    return gulp.src(paths.scripts)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Gulp watch syntax
gulp.task('watch', ['less'], function(){
    gulp.watch(paths.less, ['less']);
    // Other watchers
});

gulp.task('scripts', function() {
    // Minify and copy all JavaScript (except vendor scripts)
    // with sourcemaps all the way down
    return gulp.src(paths.scripts)
        .pipe(sourcemaps.init())
        //        .pipe(uglify())
        .pipe(header(banner, { pkg : pkg } ))
        .pipe(concat('jQuery.SPServices-' + pkg.version + '.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('build/'));
});


/*
    gulp.task('fixdocs', function () {
        return gulp.src(paths.docs) //paths.docs
            .pipe(tap(function(file) {
                gutil.log(file.path);
                var tmp = file.path.split('\\');
                var cat = tmp.length > 4 ? tmp[4] : '';
                var name = tmp[tmp.length - 1].split('.')[0];
                file.contents = Buffer.concat([
                    new Buffer(['---',
                        'label: ' + name,
                        'id: ' + name,
                        'categorySlug: \'' + cat + '\'',
                        'categoryLabel: \'' + cat + '\'',
                        'categorySort: \'alphabetical\'', // 'alphabetical' || 'rank'
                        'documentSort: \'alphabetical\'', // 'alphabetical' || 'rank'
                        '', ''].join('\n')),
                    file.contents
                ])
            }))
            .pipe(gulp.dest('dist/tmp'));
    });
*/

gulp.task('docs', function () {

    /**
    * Generate a custom sort method for given starting `order`. After the given
    * order, it will ignore casing and put periods last. So for example a call of:
    *
    *   sorter('Overview');
    *
    * That is passed:
    *
    *   - Analytics.js
    *   - iOS
    *   - Overview
    *   - Ruby
    *   - .NET
    *
    * Would guarantee that 'Overview' ends up first, with the casing in 'iOS'
    * ignored so that it falls in the normal alphabetical order, and puts '.NET'
    * last since it starts with a period. See https://gist.github.com/lambtron/c8945d3abd11c783eb67
    *
    * @param {Array} order
    * @return {Function}
    */

    function sorter(order) {
        order = order || [];

        return function(one, two) {
            var a = one.title;
            var b = two.title;

            if (!a && !b) return 0;
            if (!a) return 1;
            if (!b) return -1;

            var i = order.indexOf(a);
            var j = order.indexOf(b);

            if (~i && ~j) {
                if (i < j) return -1;
                if (j < i) return 1;
                return 0;
            }

            if (~i) return -1;
            if (~j) return 1;

            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a[0] === '.') return 1;
            if (b[0] === '.') return -1;
            if (a < b) return -1;
            if (b < a) return 1;
            return 0;
        };
    }

    return metalsmith(__dirname)
        .source('./docs')
        .ignore('templates')
        .destination('./dist/docs')
        .use(markdown())
        .use(replace({
          '**/*.html': [
            {
              find: /.md"/gi,
              replace: '.html"'
            },
            {
              find: /.md#/,
              replace: '.html#'
            }
          ]
        }))
        .use(collections({
          'Home': {
            pattern: 'index.html'
          },
          'Core': {
            pattern: 'core/{/api/index.html,*.html}',
            sortBy: sorter(['Web Services'])
          },
          'WebServices': {
            pattern: 'core/api/**/*.html',
            sortBy: 'title'
          },
          'Value Added': {
            pattern: 'value-added/**/*.html',
            sortBy: 'title'
          },
          'Utilities': {
            pattern: 'utilities/**/*.html',
            sortBy: 'title'
          }
        }))
        .use(layouts({
          engine: 'handlebars',
          directory: 'docs/templates',
          default: 'main.hbs'
        }))
        .build(function (err) {
          if (err) {
            throw err;
          }
        });
});


// Build module
gulp.task('build', function() {
    return gulp.src(paths.scripts)
        .pipe(webpack(require('./webpack.config.js'), null, function(err, stats) {
            // Output stats so we can tell what happened
            gutil.log(stats.toString());
        }))
        .pipe(rename('jQuery.SPServices-' + pkg.version + '.js'))
        .pipe(gulp.dest('build/')) // SPServices.js
        .pipe(gulpIf('*.js', uglify())) // Minify all modules
        .pipe(rename('jQuery.SPServices-' + pkg.version + '.min.js'))
        .pipe(gulp.dest('build/')); // SPServices.min.js
});

// Deploy to gh-pages
gulp.task('deploydocs', function() {
    return gulp.src(paths.dist)
        .pipe(ghPages());
});


// Default task(s).
gulp.task('default', [
    'clean:build',
    'lint',
    'less',
    'scripts',
    'build'
//    'concat',
//    'copy:processBuildVariables',
//    'uglify',
//    'zip'
]);
