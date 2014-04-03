module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
        'bower_components/codemirror/lib/codemirror.js',
        'bower_components/codemirror/mode/javascript/javascript.js',
        'bower_components/codemirror/mode/xml/xml.js',
        'bower_components/codemirror/mode/turtle/turtle.js',
        'bower_components/codemirror/addon/hint/show-hint.js',
        'bower_components/codemirror/addon/search/searchcursor.js',
        'bower_components/codemirror/addon/edit/matchbrackets.js',
        'bower_components/codemirror/addon/runmode/runmode.js',
        'bower_components/codemirror/addon/format/formatting.js',
        'src/**/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    cssmin: {
	  combine: {
		files: {
		  'dist/<%= pkg.name %>.css': [
			'bower_components/codemirror/lib/codemirror.css', 
			'bower_components/codemirror/addon/hint/show-hint.css',
			'src/**/*.css',
		]}
	  },
//	  minify: {
//		expand: true,
//		cwd: 'dist',
//		src: ['*.css', '!*.min.css'],
//		dest: 'dist',
//		ext: '.min.css'
//	  }
	},
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
        expand: true,    // allow dynamic building
        flatten: true,   // remove all unnecessary nesting
//        ext: '.min.js'   // replace .js to .min.js
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
//    jshint: {
//      files: ['Gruntfile.js', 'src/**/*.js'],
//      options: {
//        // options here to override JSHint defaults
//        globals: {
//          jQuery: true,
//          console: true,
//          module: true,
//          document: true
//        }
//      }
//    },
//    watch: {
//      files: ['<%= jshint.files %>'],
//      tasks: ['jshint']
//    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
//  grunt.loadNpmTasks('grunt-contrib-jshint');
//  grunt.loadNpmTasks('grunt-contrib-qunit');
//  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

//  grunt.registerTask('test', ['jshint']);

  grunt.registerTask('default', ['concat', 'uglify', 'cssmin']);

};
