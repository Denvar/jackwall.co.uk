import autoprefixer from "autoprefixer";
import browserSync from "browser-sync";
import spawn from "cross-spawn";
import cssnano from "cssnano";
import { dest, series, src, task, watch } from "gulp";
import postcss from "gulp-postcss";
import atimport from "postcss-import";
import tailwindcss from "tailwindcss";

const SITE_ROOT = "./_site";
const POST_BUILD_STYLESHEET = `${SITE_ROOT}/assets/css/`;
const PRE_BUILD_STYLESHEET = "./src/style.css";
const POST_BUILD_IMAGES = `${SITE_ROOT}/assets/images/`;
const PRE_BUILD_IMAGES = "./src/images/**/*.{jpg,jpeg,png}";
const TAILWIND_CONFIG = "./tailwind.config.js";

// Fix for Windows compatibility
const jekyll = process.platform === "win32" ? "jekyll.bat" : "jekyll";

const isDevelopmentBuild = process.env.NODE_ENV === "development";

task("buildJekyll", () => {
  browserSync.notify("Building Jekyll site...");

  const args = ["exec", jekyll, "build"];

  if (isDevelopmentBuild) {
    args.push("--incremental");
  }

  return spawn("bundle", args, { stdio: "inherit" });
});

task("processStyles", () => {
  browserSync.notify("Compiling styles...");

  return src(PRE_BUILD_STYLESHEET)
    .pipe(
      postcss([
        atimport(),
        tailwindcss(TAILWIND_CONFIG),
        ...(isDevelopmentBuild ? [] : [autoprefixer(), cssnano()]),
      ])
    )
    .pipe(dest(POST_BUILD_STYLESHEET));
});

task("processImages", () => {
  browserSync.notify("Compiling images...");

  return src(PRE_BUILD_IMAGES)
    // .pipe(newer(POST_BUILD_IMAGES)) // Only consider files that do not exist at destination
    // .pipe(flatMap(retinaVersions)) // flatMap is used to create additional variants of iamges
    // .pipe(scaleImages(imageFileName)) // optional parameter is used to format output file names
    // .pipe(imagemin([mozjpeg(), pngquant()])) // Here imagemin is instructed to use mozjpeg and pngquant instead of default (lossless) algorithms
    .pipe(dest(POST_BUILD_IMAGES));
})

task("startServer", () => {
  browserSync.init({
    files: [SITE_ROOT + "/**"],
    open: "local",
    port: 4000,
    server: {
      baseDir: SITE_ROOT,
      serveStaticOptions: {
        extensions: ["html"],
      },
    },
  });

  watch(
    [
      "**/*.css",
      "**/*.jpeg",
      "**/*.png",
      "**/*.jpg",
      "**/*.html",
      "**/*.js",
      "**/*.md",
      "**/*.markdown",
      "!_site/**/*",
      "!node_modules/**/*",
    ],
    { interval: 500 },
    buildSite
  );
});

const buildSite = series("buildJekyll", "processStyles", "processImages");

exports.serve = series(buildSite, "startServer");
exports.default = series(buildSite);
