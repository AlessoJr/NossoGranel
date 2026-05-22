#!/bin/bash

# Criar pastas se não existirem
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Copiar o ícone para todos os tamanhos
cp app_icons/granel.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png 2>/dev/null

# Copiar para ícone redondo também
cp app_icons/granel.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png 2>/dev/null
cp app_icons/granel.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png 2>/dev/null

echo "Ícones copiados com sucesso!"
