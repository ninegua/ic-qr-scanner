{ pkgs ? import (builtins.fetchTarball {
  name = "nixos-21.05";
  # Commit obtained using `git ls-remote https://github.com/nixos/nixpkgs-channels nixos-21.05`
  url =
    "https://github.com/nixos/nixpkgs/archive/5de44c15758465f8ddf84d541ba300b48e56eda4.tar.gz";
  # Hash obtained using `nix-prefetch-url --unpack <url>`
  sha256 = "05darjv3zc5lfqx9ck7by6p90xgbgs1ni6193pw5zvi7xp2qlg4x";
}) { } }:
with pkgs;
let
  nns-ifaces = builtins.fetchurl {
    url =
      "https://github.com/dfinity/nns-ifaces/archive/d18437c46c180f26e09f97eb764cf65165563517.tar.gz";
    sha256 = "08pry53rbwrfjphsxji9h5jjlk8k1qwfrwl1vna3709vl9z68z4i";
  };
  filter = name: type:
    let baseName = baseNameOf (toString name);
    in !(baseName == "dist" || baseName == "node_modules"
      || lib.hasSuffix ".vim" baseName)
    && lib.sources.cleanSourceFilter name type;
  cleanSource = src: lib.sources.cleanSourceWith { inherit filter src; };
  nodeDependencies =
    (pkgs.callPackage ./default.nix { inherit pkgs; }).shell.nodeDependencies;
in stdenv.mkDerivation {
  name = "ic-qr-scanner";
  version = "0.1.0";
  nativeBuildInputs = [
    nodejs
    gnumake
    nodePackages.prettier
    nodePackages.webpack
    xxd
    lld_10
    pkgsCross.wasi32.buildPackages.clang_10
  ];
  NNS_IFACES = nns-ifaces;
  src = cleanSource ./.;
  buildPhase = ''
    ln -s ${nodeDependencies}/lib/node_modules ./node_modules
    export PATH="${nodeDependencies}/bin:$PATH"
    make install
  '';
}
