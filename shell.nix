{ pkgs ? import <nixpkgs> { } }:
with pkgs;
stdenv.mkDerivation {
  name = "ic-qr-scanner";
  nativeBuildInputs = [
    nodejs
    gnumake
    gperf
    nodePackages.prettier
    nodePackages.node2nix
    pkgsCross.wasi32.buildPackages.clang_10
    xxd
    lld_10
    nixfmt
    binaryen
  ];
}
