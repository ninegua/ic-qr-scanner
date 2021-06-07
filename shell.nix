{ pkgs ? import <nixpkgs> {} }:
with pkgs;
stdenv.mkDerivation {
  name = "ic-qr-scanner";
  nativeBuildInputs = [ nodejs gnumake nodePackages.prettier ];
}
