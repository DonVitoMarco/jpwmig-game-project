var gulp = require('gulp');
var clean = require('gulp-clean');
var gulpCopy = require('gulp-copy');


gulp.task('clean:before', function () {
    return gulp
        .src('dist', {read: false})
        .pipe(clean());
});

gulp.task('copy:html', function () {
    return gulp
        .src('src/*.html')
        .pipe(gulp.dest('dist'));
});

gulp.task('copy:img', function () {
    return gulp
        .src('src/img/*')
        .pipe(gulp.dest('dist/img'));
});

gulp.task('copy:css', function () {
    return gulp
        .src('src/css/*.css')
        .pipe(gulp.dest('dist/css'));
});

gulp.task('copy:js', function () {
    return gulp
        .src('src/js/*.js')
        .pipe(gulp.dest('dist/js'));
});

gulp.task('copy', [
    'copy:html',
    'copy:css',
    'copy:js',
    'copy:img'
]);


gulp.task('default', [
    'clean:before', 'copy'
]);