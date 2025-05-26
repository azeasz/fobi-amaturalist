export const extractAuthorFromScientificName = (scientificName) => {
    // Mencari pattern nama author yang biasanya dalam kurung atau setelah spasi
    const matches = scientificName.match(/^([^\(]+)\s*(\([^)]+\)|\s+[^(]\S+.*)$/);
    if (matches) {
        return {
            name: matches[1].trim(),
            author: matches[2].trim()
        };
    }
    return {
        name: scientificName,
        author: ''
    };
};

export const getDisplayName = (item) => {
    if (item.cname_species && item.cname_species.trim() !== '') {
        return item.cname_species;
    }
    if (item.species && item.species.trim() !== '') {
        return item.species;
    }
    const { name } = extractAuthorFromScientificName(item.scientific_name);
    return name;
};
