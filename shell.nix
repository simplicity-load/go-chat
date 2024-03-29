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
    gocode
    gopkgs
    gocode-gomod
    godef
    golint
    typescript
  ];

  shellHook = ''
    echo "Welcome to the SHELL!"
    git config core.hooksPath .hooks
  '';
}
