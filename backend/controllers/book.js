const Book = require('../models/Book');
const fs = require('fs');
const path = require("path");

exports.createBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${path.parse(req.file.originalname).name}.webp`
    });
    book.save()
        .then(() => { res.status(201).json({ message: 'Livre enregistré !' }) })
        .catch(error => { res.status(400).json({ error }) })
};

exports.getAllBooks = (req, res, next) => {
    Book.find()
        .then(books => res.status(200).json(books))
        .catch(error => res.status(400).json({ error }));
}

exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => res.status(200).json(book))
        .catch(error => res.status(404).json({ error }));
}

exports.getBestRating = (req, res, next) => {
    Book.find().sort({ averageRating: -1 }).limit(3)
        .then((books) => res.status(200).json(books))
        .catch(error => res.status(400).json({ error }));
}

exports.modifyBook = (req, res, next) => {
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${path.parse(req.file.originalname).name}.webp`
    } : { ...req.body };

    delete bookObject._userId;
    Book.findOne({ _id: req.params.id })
        .then((book) => {
            if (book.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non-autorisé' })
            } else {
                Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Livre modifié !' }))
                    .catch(error => res.status(401).json({ error }));
            }
        })
        .catch((error) => {
            res.status(400).json({ error });
        })
};

exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => {
            if (book.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non-autorisé' });
            } else {
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    book.deleteOne({ _id: req.params.id })
                        .then(() => { res.status(200).json({ message: 'Livre supprimé !' }) })
                        .catch(error => res.status(401).json({ error }));
                });

            }
        })
        .catch(error => {
            res.status(500).json({ error });
        })
}

exports.createRating = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then((book) => {
            console.log(book, "book log");
            console.log()
            const oldRating = book.ratings.find((rating) => rating.userId === req.body.userId);
            if (oldRating) {
                res.status(401).json({ message: 'Livre déjà noté' })
            } else {
                book.ratings.push({
                    userId: req.body.userId,
                    grade: req.body.rating
                });
                const grades = book.ratings.map(element => element.grade)
                console.log(grades);
                let gradesSum = grades.reduce((accumulator, currentValue) => {
                    return accumulator + currentValue
                }, 0)
                let gradesAverage = Math.floor((gradesSum / grades.length));
                book.averageRating = gradesAverage;
                try {
                    book.save()
                        .then((bookrated) => res.status(200).json(bookrated))
                        .catch(error => res.status(400).json({ error }));
                }
                catch { (error) => console.log(error) };

            }
        })
        .catch(error => res.status(400).json({ error }))
};