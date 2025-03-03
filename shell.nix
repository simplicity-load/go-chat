{ pkgs, unstable }:
with pkgs;
mkShell {
  buildInputs = [
    git
    go
    gotools
    go-tools
    gopls
    go-outline
    gopkgs
    gocode-gomod
    godef
    golint
    typescript
    nodejs_20
  ];

  shellHook = ''
    echo "Welcome to the SHELL!"
    git config core.hooksPath .hooks
  '';
}
